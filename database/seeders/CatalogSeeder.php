<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $branches = [
            ['Sucursal Centro', 'Ciudad de México'],
            ['Sucursal Norte', 'Monterrey'],
            ['Sucursal Occidente', 'Guadalajara'],
            ['Sucursal Sureste', 'Puebla'],
        ];
        foreach ($branches as [$name, $city]) {
            Branch::firstOrCreate(['name' => $name], ['city' => $city]);
        }

        $categories = ['Abarrotes', 'Bebidas', 'Limpieza', 'Papelería',
                       'Higiene personal', 'Lácteos', 'Botanas', 'Congelados'];
        foreach ($categories as $name) {
            Category::firstOrCreate(['name' => $name]);
        }

        $categoryIds = Category::pluck('id')->all();

        for ($i = 1; $i <= 150; $i++) {
            Product::firstOrCreate(
                ['sku' => sprintf('SKU-%04d', $i)],
                Product::factory()->make([
                    'category_id' => $categoryIds[array_rand($categoryIds)],
                    'active' => $i % 10 !== 0, // 10 % inactivos
                ])->getAttributes()
            );
        }
    }
}
