<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'أدمن خطوات',
            'email' => 'admin@khtwat.com',
            'role' => User::ROLE_ADMIN,
        ]);

        User::factory()->create([
            'name' => 'ميديا باير',
            'email' => 'mediabuyer@khtwat.com',
            'role' => User::ROLE_MEDIABUYER,
        ]);

        $clientUser = User::factory()->create([
            'name' => 'زبون تجريبي',
            'email' => 'client@khtwat.com',
            'role' => User::ROLE_CLIENT,
        ]);

        Client::create([
            'user_id' => $clientUser->id,
            'business_name' => 'نشاط تجريبي',
            'meta_connected' => false,
        ]);
    }
}
