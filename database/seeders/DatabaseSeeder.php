<?php

namespace Database\Seeders;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Model::unguard();

        $this->call([
            UserSeeder::class,
            CatalogSeeder::class,
            SaleSeeder::class,
        ]);
    }
}

//se modifica el codigo para hacer la prueba de los 60 segundos