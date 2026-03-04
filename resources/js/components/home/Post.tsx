import { useState } from 'react';

import Additional from './quotation/Additional';
import CorporateRoomSettings from './quotation/CooperateRoomSetting';
import TaxSettingsForm from './TaxSettingsForm';

import SendRatesNotificationEmail from '../ratesNotification/SendRatesNotificationEmail';
import AccommodationNotes from './AccommodationNotes';
import Agents from './Agents';
import EmailTemplates from './emailTemplates/EmailTemplates';
import OpportunityTypes from './opportunityTypes/OpportunityTypes';
import PackagesSettings from './PackagesSettings';
import SupplementFiles from './SupplementFiles';

const PackagesForm = () => {
    const [activeTab, setActiveTab] = useState('view');

    // For edit form

    return (
        <div className="rounded-lg bg-white p-4 shadow-sm">
            {/* Tabs - Responsive */}
            <div className="scrollbar-hide flex space-x-4 overflow-x-auto pb-2">
                {['view', 'additional', 'corporate', 'tax', 'templates', 'types', 'notes', 'supplement-images', 'agents', 'rates-notification'].map(
                    (tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 text-sm whitespace-nowrap sm:text-base ${
                                activeTab === tab ? 'border-b-2 border-black font-bold text-black' : 'text-gray-600'
                            }`}
                        >
                            {tab === 'view' && 'Packages'}
                            {tab === 'additional' && 'Additionals'}
                            {tab === 'corporate' && 'Corporate Rooms'}
                            {tab === 'tax' && 'Tax Rates'}
                            {tab === 'types' && 'Opportunity Types'}
                            {tab === 'templates' && 'Email Templates'}
                            {tab === 'notes' && 'Default Notes'}
                            {tab === 'agents' && 'Agents'}
                            {tab === 'rates-notification' && 'Rates Notification'}
                            {tab === 'supplement-images' && 'Supplement Images'}
                        </button>
                    ),
                )}
            </div>

            {/* Tab Content */}
            {activeTab === 'additional' && <Additional />}
            {activeTab === 'corporate' && <CorporateRoomSettings />}
            {activeTab === 'tax' && <TaxSettingsForm />}
            {activeTab === 'view' && <PackagesSettings />}
            {activeTab === 'types' && <OpportunityTypes />}
            {activeTab === 'templates' && <EmailTemplates />}
            {activeTab === 'notes' && <AccommodationNotes />}
            {activeTab === 'agents' && <Agents />}
            {activeTab === 'rates-notification' && <SendRatesNotificationEmail />}
            {activeTab === 'supplement-images' && <SupplementFiles />}
        </div>
    );
};

export default PackagesForm;
