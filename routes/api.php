<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\CatalogController;



Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    // api de ventas
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/{sale}', [SaleController::class, 'show']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::post('/sales/{sale}/cancel', [SaleController::class, 'cancel']);
    // reportes 
     Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);
    Route::get('/reports/monthly', [ReportController::class, 'monthly']);
    Route::get('/reports/top-products', [ReportController::class, 'topProducts']);
    Route::get('/reports/sellers', [ReportController::class, 'sellers']);
    Route::get('/reports/branch-category', [ReportController::class, 'branchCategory']);
    Route::get('/reports/margin', [ReportController::class, 'margin']);
    Route::get('/reports/{report}/export', [ReportController::class, 'export']);
    
    //IA
    Route::post('/ai/ask', [AiController::class, 'ask'])->middleware('throttle:20,1');
    Route::post('/ai/summary', [AiController::class, 'summary'])->middleware('throttle:20,1');

    //catalog controller
    Route::get('/branches', [CatalogController::class, 'branches']);
    Route::get('/sellers', [CatalogController::class, 'sellers']);
    Route::get('/products', [CatalogController::class, 'products']);

});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
