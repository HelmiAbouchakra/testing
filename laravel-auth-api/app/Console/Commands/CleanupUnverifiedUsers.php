<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupUnverifiedUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:cleanup-unverified-users';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove unverified users who have not verified their email within the time limit';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting cleanup of unverified users...');
        
        // Find users who are still pending and their pending_until time has passed
        $expiredUsers = User::where('status', 'pending')
            ->whereNotNull('pending_until')
            ->where('pending_until', '<', now())
            ->whereNull('email_verified_at')
            ->get();
            
        $count = $expiredUsers->count();
        
        if ($count === 0) {
            $this->info('No expired unverified users found.');
            return;
        }
        
        $this->info("Found {$count} expired unverified users to delete.");
        
        foreach ($expiredUsers as $user) {
            $this->comment("Deleting user: {$user->email}");
            
            try {
                // Log the deletion
                Log::info("Deleting unverified user with expired pending status: {$user->email}");
                
                // Delete the user
                $user->delete();
            } catch (\Exception $e) {
                $this->error("Error deleting user {$user->email}: {$e->getMessage()}");
                Log::error("Error deleting unverified user {$user->email}: {$e->getMessage()}");
            }
        }
        
        $this->info('Cleanup completed successfully.');
    }
}
