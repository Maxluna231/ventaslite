<?php
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;


Route::get('/', fn () => response()->json([
    'app' => 'VentasLite API',
    'status' => 'ok',
]));