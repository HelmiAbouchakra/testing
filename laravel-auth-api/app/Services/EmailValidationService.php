<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmailValidationService
{
    /**
     * Validate an email address using Abstract API
     *
     * @param string $email
     * @return array
     */
    public function validateEmail(string $email): array
    {
        try {
            // Replace with your actual Abstract API key
            $apiKey = env('ABSTRACT_API_KEY');
            
            if (!$apiKey) {
                Log::warning('Abstract API key not found in environment variables');
                return [
                    'valid' => false,
                    'error' => 'API key not configured'
                ];
            }
            
            $response = Http::get('https://emailvalidation.abstractapi.com/v1/', [
                'api_key' => $apiKey,
                'email' => $email
            ]);
            
            if ($response->successful()) {
                $data = $response->json();
                
                // Log the API response for debugging
                Log::info('Abstract API email validation response', [
                    'email' => $email,
                    'response' => $data
                ]);
                
                return [
                    'valid' => $data['deliverability'] === 'DELIVERABLE',
                    'score' => $data['quality_score'] ?? 0,
                    'is_disposable' => $data['is_disposable_email'] ?? false,
                    'is_free_email' => $data['is_free_email'] ?? false,
                    'error' => null
                ];
            } else {
                Log::error('Abstract API email validation failed', [
                    'email' => $email,
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                
                return [
                    'valid' => false,
                    'error' => 'API request failed: ' . $response->status()
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception during email validation', [
                'email' => $email,
                'exception' => $e->getMessage()
            ]);
            
            return [
                'valid' => false,
                'error' => 'Service error: ' . $e->getMessage()
            ];
        }
    }
}
