<?php

namespace App\Policies;

use App\Models\FileUpload;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class FileUploadPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return true;
    }

    public function view(?User $user, FileUpload $fileUpload)
    {
        return true;
    }

    public function create(?User $user)
    {
        return true;
    }

    public function update(?User $user, FileUpload $fileUpload)
    {
        return true;
    }

    public function delete(?User $user, FileUpload $fileUpload)
    {
        return true;
    }
}