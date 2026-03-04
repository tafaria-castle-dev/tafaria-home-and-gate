enum OpportunityStage {
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

export interface ContactPerson {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    title?: string;
}

export interface Contact {
    id: string;
    institution?: string;
    mobile?: string;
    type: ContactType;
    created_at: Date;
    updated_at: Date;
    contactPersons?: ContactPerson[];
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface LastUpdate {
    id: string;
    super_staff?: string;
    updated_by: User;
    updated_at: Date;
    created_at: Date;
}
export interface OpportunityFile {
    id: string;
    original_name: string;
    file_path: string;
}
export interface Opportunity {
    id: string;
    name: string;
    stage: OpportunityStage;
    description?: string;
    prepared_by?: string;
    probability: number;
    close_date: Date;
    amount?: number;
    year?: string;
    created_by: User;
    assistant_clerk: User;
    contact: Contact;
    contact_person: ContactPerson;
    last_update?: LastUpdate;
    created_at: Date;
    updated_at: Date;
    files?: OpportunityFile[];
}

export interface OpportunitySearchResult {
    results: Opportunity[];
    totalCount: number;
    totalPages: number;
}

export interface OpportunityDetailsProps {
    opportunity: Opportunity;
}
