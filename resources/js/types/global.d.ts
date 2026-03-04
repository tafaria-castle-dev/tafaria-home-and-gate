// src/types/global.d.ts
declare global {
    export enum Role {
        client = 'client',
        staff = 'staff',
        admin = 'admin',
        super_staff = 'super_staff',
    }

    export enum Resident {
        ea = 'ea',
        non = 'non',
    }

    export enum RoomType {
        single = 'single',
        double = 'double',
        triple = 'triple',
        quadra = 'quadra',
    }

    export enum EmailType {
        sent = 'sent',
        received = 'received',
    }

    export enum Type {
        leisure = 'leisure',
        corporate = 'corporate',
    }

    export enum OpportunityStage {
        None = 'None',
        Qualify = 'Qualify',
        MeetAndPresent = 'MeetAndPresent',
        Propose = 'Propose',
        Negotiate = 'Negotiate',
        ClosedWon = 'ClosedWon',
        ClosedLost = 'ClosedLost',
    }

    export enum ContactType {
        INDIVIDUAL = 'INDIVIDUAL',
        INSTITUTION = 'INSTITUTION',
    }

    export interface BulkEmailAttachment {
        id: string;
        fileName: string;
        filePath: string;
        fileSize: number;
        fileType: string;
        emailId: string;
        created_at: Date;
        bulkEmail?: BulkEmail;
    }

    export interface BulkEmail {
        id: string;
        subject?: string;
        description?: string;
        description_json?: any;
        template_id?: string;
        created_by_id: string;
        sent_by: string;
        created_at: Date;
        updated_at: Date;
        template?: EmailTemplate;
        created_by?: User;
        recipients?: Contact[];
        attachments?: BulkEmailAttachment[];
    }

    export interface EmailTemplate {
        id: string;
        name: string;
        subject: string;
        description: string;
        description_json?: any;
        created_at: Date;
        updated_at: Date;
        created_by_id: string;
        created_by?: User;
        emailActivities?: EmailActivity[];
        bulkEmails?: BulkEmail[];
    }

    export interface OpportunityName {
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
    }

    export interface FileUpload {
        id: string;
        file_name: string;
        file_path: string;
        file_size: number;
        file_type: string;
        category: string;
    }

    export interface EmailAttachment {
        id: string;
        file_name: string;
        file_path: string;
        file_size: number;
        file_type: string;
        email_id: string;
        created_at: Date;
        email?: EmailActivity;
    }

    export interface EmailActivity {
        id: string;
        subject: string;
        description: string;
        description_json?: any;
        type: EmailType;
        opportunityId: string;
        template_id?: string;
        created_by_id: string;
        super_staff?: string;
        created_at: Date;
        updated_at: Date;
        opportunity?: Opportunity;
        template?: EmailTemplate;
        created_by?: User;
        attachments: EmailAttachment[];
    }

    export interface CallLog {
        id: string;
        subject: string;
        description: string;
        opportunityId: string;
        created_by_id: string;
        created_at: Date;
        updated_at: Date;
        super_staff?: string;
        opportunity?: Opportunity;
        created_by?: User;
    }

    export interface Opportunity {
        id: string;
        name: string;
        stage: OpportunityStage;
        description?: string;
        year?: string;
        probability: number;
        close_date: Date;
        amount?: number;
        preparedBy?: string;
        created_by_id: string;
        assistantClerkId: string;
        contact_id: string;
        contactPersonId: string;
        lastUpdateId?: string;
        created_at: Date;
        updated_at: Date;
        files: OpportunityFile[];
        created_by: User;
        assistant_clerk: User;
        contact: Contact;
        contactPerson: ContactPerson;
        last_update?: LastUpdate;
        emailActivities?: EmailActivity[];
        callLogs?: CallLog[];
    }

    export interface LastUpdate {
        id: string;
        updatedById: string;
        updated_at: Date;
        super_staff?: string;
        created_at: Date;
        updated_by?: User;
        opportunity?: Opportunity;
    }

    export interface OpportunityFile {
        id: string;
        filePath: string;
        opportunity?: Opportunity;
    }

    export interface User {
        id: string;
        name: string;
        email: string;
        emailPassword?: string;
        phone_number: string;
        signature: string;
        created_at: Date;
        updated_at: Date;
        emailVerified?: Date;
        verificationToken?: string;
        deleted: boolean;
        emailPasswordUpdatedAt?: Date;
        verificationTokenExpires?: Date;
        role: Role;
        passwordResetToken?: string;
        passwordResetExpires?: Date;
        passwordChangedAt?: Date;
        posts?: Post[];
        bookings?: Booking[];
        quotations?: Quotation[];
        createdOpportunities?: Opportunity[];
        assistantClerkOpportunities?: Opportunity[];
        emailTemplates?: EmailTemplate[];
        bulkEmails?: BulkEmail[];
        emailActivities?: EmailActivity[];
        callLogs?: CallLog[];
        lastUpdatedOpportunities?: LastUpdate[];
        customers?: Customer[];
        reservationsCreated?: Reservation[];
        reservationsCleared?: Reservation[];
    }

    export interface VerificationToken {
        id: string;
        email: string;
        token: string;
        expires: Date;
    }

    export interface Booking {
        id: string;
        user_id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        user?: User;
    }

    export interface Quotation {
        id: string;
        user_id: string;
        is_invoice_generated: boolean;
        no_accommodation: boolean;
        status: string;
        approved_on?: Date;
        quotation_details: any;
        created_at: Date;
        updated_at: Date;
        user?: User;
    }

    export interface Customer {
        id: string;
        name: string;
        email?: string;
        phone?: string;
        address?: string;
        user_id: string;
        user?: User;
    }

    export interface ContactPerson {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        title?: string;
        created_at: Date;
        updated_at: Date;
        contact_id?: string;
        contactClerk?: string;
        contact?: Contact;
        opportunities?: Opportunity[];
        reservations?: Reservation[];
    }

    export interface Contact {
        id: string;
        institution?: string;
        mobile?: string;
        type: ContactType;
        created_at: Date;
        updated_at: Date;
        opportunities?: Opportunity[];
        reservations?: Reservation[];
        bulkEmails?: BulkEmail[];
        contactPersons: ContactPerson[];
    }

    export interface Post {
        id: string;
        created_at: Date;
        updated_at: Date;
        title: string;
        content: string;
        name: string;
        published: boolean;
        authorId: string;
        created_by_id: string;
        created_by?: User;
    }

    export interface Packages {
        id: string;
        created_at: Date;
        updated_at: Date;
        board_type: string;
        name: string;
        description: string;
        amount_ksh: number;
        resident: Resident;
        room_type: RoomType;
        number_of_rooms: number;
        taxable_amount: number;
        taxes?: Tax[];
        discounts?: Discount[];
    }

    export interface CorporateRoomSetting {
        id: string;
        created_at: Date;
        updated_at: Date;
        board_type: string;
        room_type: RoomType;
        description: string;
        amount_ksh: number;
        taxable_amount: number;
        taxes?: Tax[];
        discounts?: Discount[];
    }

    export interface Tax {
        id: string;
        created_at: Date;
        updated_at: Date;
        name: string;
        tax_code: string;
        rate: number;
        additionals?: Additional[];
        packages?: Packages[];
        corporateRoomSetting?: CorporateRoomSetting[];
    }

    export interface Discount {
        id: string;
        created_at: Date;
        updated_at: Date;
        name: string;
        discountCode: string;
        rate: number;
        additionals?: Additional[];
        packages?: Packages[];
        corporateRoomSetting?: CorporateRoomSetting[];
    }

    export interface Additional {
        id: string;
        created_at: Date;
        updated_at: Date;
        name: string;
        description: string;
        amount_ksh: number;
        dynamic: string;
        resident: Resident;
        type: Type;
        taxable_amount: number;
        priority: number;
        taxes?: Tax[];
        discounts?: Discount[];
    }

    export interface AccommodationNote {
        id: string;
        created_at: Date;
        updated_at: Date;
        name: string;
        description: string;
    }

    export interface Reservation {
        id: string;
        contact_id?: string;
        contactPersonId?: string;
        visitDate?: Date;
        carPlateNumber?: string;
        reservationNumber?: string;
        idOrPassportNumber?: string;
        idOrpassportPhoto?: string;
        cleared: boolean;
        clearedById?: string;
        clearedDate?: Date;
        created_by_id: string;
        created_at: Date;
        updated_at: Date;
        contact?: Contact;
        contactPerson?: ContactPerson;
        clearedBy?: User;
        created_by?: User;
    }
}

export {};
