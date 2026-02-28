<?php

namespace App\Services;

use App\Enums\Platform;
use App\Models\Client;
use App\Models\DailyReport;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * سحب بيانات الصرف وعدد الرسائل من Meta Graph API وتحديث daily_reports.
 */
class MetaAdsService
{
    protected string $graphVersion = 'v18.0';

    /**
     * مزامنة بيانات أمس لجميع الزبائن المرتبطين بميتا والذين لديهم حساب إعلاني محفوظ.
     */
    public function syncYesterday(): void
    {
        $yesterday = Carbon::yesterday()->format('Y-m-d');
        $clients = $this->getSyncableClients();
        foreach ($clients as $client) {
            try {
                $this->syncClientForDate($client, $yesterday);
            } catch (\Throwable $e) {
                Log::warning('Meta sync failed for client '.$client->id.': '.$e->getMessage());
            }
        }
    }

    /**
     * مزامنة بيانات زبون واحد لنطاق تواريخ (من-إلى). يُستخدم عند طلب التاجر "جلب بيانات الحملات".
     */
    public function syncClientDateRange(Client $client, string $from, string $to): array
    {
        $fromDate = Carbon::parse($from)->startOfDay();
        $toDate = Carbon::parse($to)->startOfDay();
        if ($fromDate->gt($toDate)) {
            return ['synced_days' => 0, 'errors' => []];
        }
        $synced = 0;
        $errors = [];
        $current = $fromDate->copy();
        while ($current->lte($toDate)) {
            $dateStr = $current->format('Y-m-d');
            try {
                $this->syncClientForDate($client, $dateStr);
                $synced++;
            } catch (\Throwable $e) {
                $errors[] = "{$dateStr}: ".$e->getMessage();
                Log::warning("Meta sync failed for client {$client->id} date {$dateStr}: ".$e->getMessage());
            }
            $current->addDay();
        }
        return ['synced_days' => $synced, 'errors' => $errors];
    }

    /**
     * زبائن لديهم ربط ميتا وحساب إعلاني محفوظ.
     */
    private function getSyncableClients(): \Illuminate\Database\Eloquent\Collection
    {
        return Client::where('meta_connected', true)
            ->whereNotNull('long_lived_token')
            ->whereNotNull('fb_ad_account_id')
            ->where('fb_ad_account_id', '!=', '')
            ->get();
    }

    /**
     * سحب بيانات يوم معين لزبون واحد وتحديث السطر الخاص بمنصة Facebook في daily_reports.
     */
    public function syncClientForDate(Client $client, string $date): void
    {
        $accountId = $client->fb_ad_account_id;
        if (! str_starts_with($accountId, 'act_')) {
            $accountId = 'act_'.$accountId;
        }

        $url = "https://graph.facebook.com/{$this->graphVersion}/{$accountId}/insights?" . http_build_query([
            'time_range' => json_encode([
                'since' => $date,
                'until' => $date,
            ]),
            'fields' => 'spend,actions',
            'access_token' => $client->long_lived_token,
        ]);

        $response = Http::get($url);
        if (! $response->successful()) {
            throw new \RuntimeException('Meta API error: '.$response->body());
        }

        $data = $response->json();
        $rows = $data['data'] ?? [];

        $totalSpend = 0.0;
        $totalLeads = 0;

        foreach ($rows as $row) {
            $totalSpend += (float) ($row['spend'] ?? 0);
            $totalLeads += $this->countLeadsFromActions($row['actions'] ?? []);
        }

        // تحديث أو إنشاء سطر منصة Facebook لذلك اليوم (المنصة الغالبة لميتا)
        DailyReport::updateOrCreate(
            [
                'client_id' => $client->id,
                'date' => $date,
                'platform' => Platform::Facebook,
            ],
            [
                'ad_spend' => round($totalSpend, 2),
                'leads_count' => $totalLeads,
                // orders_count و order_value يبقى كما أدخله الزبون أو 0
            ]
        );
    }

    /**
     * استخراج عدد الرسائل (Leads) من مصفوفة actions.
     */
    private function countLeadsFromActions(array $actions): int
    {
        $count = 0;
        $leadTypes = ['lead', 'onsite_conversion.lead', 'lead_grouped', 'contact'];

        foreach ($actions as $action) {
            $type = $action['action_type'] ?? '';
            foreach ($leadTypes as $leadType) {
                if ($type === $leadType || str_contains($type, 'lead')) {
                    $count += (int) ($action['value'] ?? 0);
                    break;
                }
            }
        }

        return $count;
    }

    /**
     * أهداف ميتا التي نعتبرها "رسائل" (Leads / Messages).
     */
    private static function objectiveIsMessages(string $objective): bool
    {
        $messages = ['OUTCOME_LEADS', 'LEAD_GENERATION', 'MESSAGES', 'CONVERSATIONS'];
        foreach ($messages as $o) {
            if (stripos($objective, $o) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * أهداف ميتا التي نعتبرها "زيارات" (Traffic / Link clicks).
     */
    private static function objectiveIsVisits(string $objective): bool
    {
        $visits = ['OUTCOME_TRAFFIC', 'LINK_CLICKS', 'OUTCOME_AWARENESS', 'BRAND_AWARENESS', 'REACH'];
        foreach ($visits as $o) {
            if (stripos($objective, $o) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * تصنيف الهدف إلى: messages | visits | other
     */
    private static function objectiveCategory(string $objective): string
    {
        if (self::objectiveIsMessages($objective)) {
            return 'messages';
        }
        if (self::objectiveIsVisits($objective)) {
            return 'visits';
        }
        return 'other';
    }

    /**
     * استخراج عدد النقرات (Link clicks) من actions.
     */
    private function countLinkClicksFromActions(array $actions): int
    {
        $count = 0;
        foreach ($actions as $action) {
            $type = $action['action_type'] ?? '';
            if ($type === 'link_click' || str_contains($type, 'link_click')) {
                $count += (int) ($action['value'] ?? 0);
            }
        }
        return $count;
    }

    /**
     * جلب حملات ميتا الشغالة + insights لنطاق تواريخ، مجمّعة حسب هدف الحملة (رسائل / زيارات).
     * للميديا باير — يستدعى مع client_id من الطلب.
     */
    public function getCampaignsAndInsightsByObjective(Client $client, string $from, string $to): array
    {
        $accountId = $client->fb_ad_account_id;
        if (! $accountId) {
            return ['objectives' => ['messages' => ['spend' => 0, 'leads' => 0, 'campaigns' => []], 'visits' => ['spend' => 0, 'link_clicks' => 0, 'campaigns' => []]], 'campaigns' => [], 'error' => 'no_ad_account'];
        }
        if (! str_starts_with($accountId, 'act_')) {
            $accountId = 'act_'.$accountId;
        }
        $token = $client->long_lived_token;
        if (! $token) {
            return ['objectives' => ['messages' => ['spend' => 0, 'leads' => 0, 'campaigns' => []], 'visits' => ['spend' => 0, 'link_clicks' => 0, 'campaigns' => []]], 'campaigns' => [], 'error' => 'no_token'];
        }

        $baseUrl = "https://graph.facebook.com/{$this->graphVersion}";
        $timeRange = json_encode(['since' => $from, 'until' => $to]);

        // 1) جلب الحملات (شغالة أو موقوفة مؤقتاً) مع الهدف
        $campaignsUrl = "{$baseUrl}/{$accountId}/campaigns?" . http_build_query([
            'fields' => 'id,name,objective,effective_status',
            'filtering' => json_encode([['field' => 'effective_status', 'operator' => 'IN', 'value' => ['ACTIVE', 'PAUSED']]]),
            'access_token' => $token,
        ]);
        $campResp = Http::get($campaignsUrl);
        if (! $campResp->successful()) {
            Log::warning('Meta campaigns API failed: '.$campResp->body());
            return ['objectives' => ['messages' => ['spend' => 0, 'leads' => 0, 'campaigns' => []], 'visits' => ['spend' => 0, 'link_clicks' => 0, 'campaigns' => []]], 'campaigns' => [], 'error' => 'campaigns_failed'];
        }
        $campaignsList = $campResp->json()['data'] ?? [];

        // 2) جلب insights على مستوى الحملة للنطاق الزمني
        $insightsUrl = "{$baseUrl}/{$accountId}/insights?" . http_build_query([
            'level' => 'campaign',
            'time_range' => $timeRange,
            'fields' => 'campaign_id,campaign_name,spend,actions',
            'access_token' => $token,
        ]);
        $insResp = Http::get($insightsUrl);
        $insightsRows = $insResp->successful() ? ($insResp->json()['data'] ?? []) : [];

        $campaignById = [];
        foreach ($campaignsList as $c) {
            $campaignById[$c['id']] = [
                'id' => $c['id'],
                'name' => $c['name'] ?? '',
                'objective' => $c['objective'] ?? 'UNKNOWN',
                'status' => $c['effective_status'] ?? '',
            ];
        }

        $messagesCampaigns = [];
        $visitsCampaigns = [];
        $messagesSpend = 0.0;
        $messagesLeads = 0;
        $visitsSpend = 0.0;
        $visitsClicks = 0;

        foreach ($insightsRows as $row) {
            $cid = $row['campaign_id'] ?? '';
            $spend = (float) ($row['spend'] ?? 0);
            $leads = $this->countLeadsFromActions($row['actions'] ?? []);
            $clicks = $this->countLinkClicksFromActions($row['actions'] ?? []);
            $campaignName = $row['campaign_name'] ?? $campaignById[$cid]['name'] ?? $cid;
            $objective = $campaignById[$cid]['objective'] ?? 'UNKNOWN';
            $cat = self::objectiveCategory($objective);

            $status = $campaignById[$cid]['status'] ?? '';
            $resultsCount = $cat === 'messages' ? $leads : $clicks;
            $costPerResult = $resultsCount > 0 ? round($spend / $resultsCount, 2) : 0.0;

            $entry = [
                'campaign_id' => $cid,
                'campaign_name' => $campaignName,
                'objective' => $objective,
                'status' => $status,
                'spend' => round($spend, 2),
                'leads' => $leads,
                'link_clicks' => $clicks,
                'results_count' => $resultsCount,
                'cost_per_result' => $costPerResult,
            ];

            if ($cat === 'messages') {
                $messagesSpend += $spend;
                $messagesLeads += $leads;
                $messagesCampaigns[] = $entry;
            } elseif ($cat === 'visits') {
                $visitsSpend += $spend;
                $visitsClicks += $clicks;
                $visitsCampaigns[] = $entry;
            } else {
                $messagesCampaigns[] = $entry;
                $messagesSpend += $spend;
                $messagesLeads += $leads;
            }
        }

        return [
            'objectives' => [
                'messages' => [
                    'spend' => round($messagesSpend, 2),
                    'leads' => $messagesLeads,
                    'campaigns' => $messagesCampaigns,
                ],
                'visits' => [
                    'spend' => round($visitsSpend, 2),
                    'link_clicks' => $visitsClicks,
                    'campaigns' => $visitsCampaigns,
                ],
            ],
            'campaigns' => $campaignsList,
        ];
    }
}
