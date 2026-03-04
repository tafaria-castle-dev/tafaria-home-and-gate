<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProviders extends ServiceProvider
{
    protected $policies = [
        'App\Models\User' => 'App\Policies\UserPolicy',
        'App\Models\BulkEmailAttachment' => 'App\Policies\BulkEmailAttachmentPolicy',
        'App\Models\BulkEmail' => 'App\Policies\BulkEmailPolicy',
        'App\Models\EmailTemplate' => 'App\Policies\EmailTemplatePolicy',
        'App\Models\OpportunityName' => 'App\Policies\OpportunityNamePolicy',
        'App\Models\FileUpload' => 'App\Policies\FileUploadPolicy',
        'App\Models\EmailAttachment' => 'App\Policies\EmailAttachmentPolicy',
        'App\Models\EmailActivity' => 'App\Policies\EmailActivityPolicy',
        'App\Models\CallLog' => 'App\Policies\CallLogPolicy',
        'App\Models\Opportunity' => 'App\Policies\OpportunityPolicy',
        'App\Models\LastUpdate' => 'App\Policies\LastUpdatePolicy',
        'App\Models\VerificationToken' => 'App\Policies\VerificationTokenPolicy',
        'App\Models\Booking' => 'App\Policies\BookingPolicy',
        'App\Models\Quotation' => 'App\Policies\QuotationPolicy',
        'App\Models\Customer' => 'App\Policies\CustomerPolicy',
        'App\Models\ContactPerson' => 'App\Policies\ContactPersonPolicy',
        'App\Models\Contact' => 'App\Policies\ContactPolicy',
        'App\Models\Post' => 'App\Policies\PostPolicy',
        'App\Models\Package' => 'App\Policies\PackagePolicy',
        'App\Models\CorporateRoomSetting' => 'App\Policies\CorporateRoomSettingPolicy',
        'App\Models\Tax' => 'App\Policies\TaxPolicy',
        'App\Models\Discount' => 'App\Policies\DiscountPolicy',
        'App\Models\Additional' => 'App\Policies\AdditionalPolicy',
        'App\Models\AccommodationNote' => 'App\Policies\AccommodationNotePolicy',
        'App\Models\Reservation' => 'App\Policies\ReservationPolicy',
    ];

    public function boot()
    {
        $this->registerPolicies();
    }
}