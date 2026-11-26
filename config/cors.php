<?php

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    // Orígenes permitidos, separados por coma en CORS_ALLOWED_ORIGINS
    'allowed_origins' => array_filter(
        array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')))
    ),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => false,

];