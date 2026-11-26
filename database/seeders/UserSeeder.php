<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@ventaslite.test'],
            ['name' => 'Administrador', 'password' => 'password', 'role' => 'admin']
        );

        for ($i = 1; $i <= 8; $i++) {
            User::firstOrCreate(
                ['email' => "vendedor{$i}@ventaslite.test"],
                ['name' => fake()->name(), 'password' => 'password', 'role' => 'vendedor']
            );
        }
    }
}