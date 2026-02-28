<?php

namespace App\Enums;

enum Platform: string
{
    case TikTok = 'tiktok';
    case WhatsApp = 'whatsapp';
    case Messenger = 'messenger';
    case Facebook = 'facebook';
    case Website = 'website';

    /**
     * تسمية المنصة للعرض (مطابقة CSV)
     */
    public function label(): string
    {
        return match ($this) {
            self::TikTok => 'TikTok',
            self::WhatsApp => 'WhatsApp',
            self::Messenger => 'Messenger',
            self::Facebook => 'Facebook',
            self::Website => 'Website',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
