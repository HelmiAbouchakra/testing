<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailWithCode extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * The verification code.
     *
     * @var string
     */
    protected $code;

    /**
     * Create a new notification instance.
     *
     * @param string $code
     * @return void
     */
    public function __construct(string $code)
    {
        $this->code = $code;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name');
        
        return (new MailMessage)
            ->subject("Verify your email address for {$appName}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("Thank you for registering with {$appName}.")
            ->line("Please use the verification code below to verify your email address:")
            ->line("<div style='font-size: 24px; font-weight: bold; letter-spacing: 8px; text-align: center; margin: 20px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px;'>{$this->code}</div>")
            ->line("This code will expire in 60 minutes.")
            ->line("If you did not create an account, no further action is required.")
            ->salutation("Regards, {$appName} Team");
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'code' => $this->code,
        ];
    }
}
