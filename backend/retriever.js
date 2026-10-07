const { RRC_NEXUS_KNOWLEDGE } = require('./knowledge');

const normalize = (message) => message.toLowerCase().replace(/[^a-z0-9₹]+/g, ' ').trim();

const includesAny = (message, terms) => {
    const paddedMessage = ` ${message} `;
    return terms.some(term => paddedMessage.includes(` ${normalize(term)} `));
};

function retrieveKnowledge(userMessage) {
    if (typeof userMessage !== 'string') {
        return { topics: [], context: '' };
    }

    const message = normalize(userMessage);
    if (!message) {
        return { topics: [], context: '' };
    }

    const topics = [];
    const sections = [];
    const addSection = (topic, title, facts) => {
        if (!topics.includes(topic)) {
            topics.push(topic);
            sections.push(`${title}:\n${JSON.stringify(facts, null, 2)}`);
        }
    };

    const planAliases = [
        { name: 'Day Pass', terms: ['day pass', 'day plan'] },
        { name: 'Weekly Plan', terms: ['weekly plan', 'weekly pass', 'weekly'] },
        { name: 'Student Desk', terms: ['student desk', 'student plan'] },
        { name: 'Hot Desk', terms: ['hot desk', 'hotdesk'] },
        { name: 'Dedicated Desk', terms: ['dedicated desk', 'fixed desk'] },
        { name: 'Private Cabin', terms: ['private cabin', 'office cabin', 'cabin', '2 persons', '4 persons', 'small team'] },
        { name: 'Meeting Room', terms: ['meeting room', 'meeting rooms', 'conference room', 'conference', 'meeting facilities', 'room booking', 'book a room'] },
        { name: 'Virtual Office', terms: ['virtual office'] }
    ];
    const requestedPlans = planAliases
        .filter(plan => includesAny(message, plan.terms))
        .map(plan => RRC_NEXUS_KNOWLEDGE.workspacePlans.find(entry => entry.name === plan.name))
        .filter(Boolean);
    const hasPlanIntent = includesAny(message, [
        'plan', 'plans', 'all prices', 'workspace pricing', 'workspace plans', 'workspace options'
    ]) || (
        !includesAny(message, ['night owl', 'night', 'evening']) &&
        includesAny(message, ['price', 'pricing', 'cost', 'rate', 'how much']) &&
        includesAny(message, ['workspace', 'coworking', 'coworking space'])
    );

    if (requestedPlans.length > 0 || hasPlanIntent) {
        const plans = requestedPlans.length > 0
            ? requestedPlans
            : RRC_NEXUS_KNOWLEDGE.workspacePlans;
        addSection('workspacePlans', 'Approved workspace plan information', plans);
    }

    if (includesAny(message, [
        'night owl', 'night', 'evening', '6pm', '6 pm', '6am', '6 am', 'discount'
    ])) {
        addSection('nightOwl', 'Approved Night Owl information', {
            ...RRC_NEXUS_KNOWLEDGE.nightOwl,
            instruction: 'The exact applicable price requires confirmation. Do not calculate a price.'
        });
    }

    if (includesAny(message, [
        'facilities', 'facility', 'amenities', 'amenity', 'wifi', 'wi fi',
        'parking', 'cctv', 'biometric', 'printing', 'printer', 'power backup',
        'air conditioning', 'air conditioned', 'ac', 'desks',
        'locker', 'seating', 'focus zone', 'focus zones', 'meeting facilities'
    ]) || (requestedPlans.length === 0 && includesAny(message, ['desk']))) {
        addSection('facilities', 'Approved facilities', RRC_NEXUS_KNOWLEDGE.facilities);
    }

    if (includesAny(message, ['meeting room', 'meeting rooms', 'conference room', 'conference', 'meeting', 'room booking', 'book a room'])) {
        addSection('meetingRoom', 'Approved meeting room information', RRC_NEXUS_KNOWLEDGE.meetingRoom);
    }

    if (includesAny(message, ['private cabin', 'cabin', 'office cabin', '2 persons', '4 persons', 'small team'])) {
        addSection('privateCabin', 'Approved private cabin information', RRC_NEXUS_KNOWLEDGE.privateCabin);
    }

    if (includesAny(message, [
        'startup', 'business registration', 'registration', 'gst', 'pan', 'tan',
        'mentorship', 'incubation', 'startup growth lab', 'legal', 'compliance',
        'technical support', 'software', 'virtual office'
    ])) {
        addSection('startupSupport', 'Approved startup support information', RRC_NEXUS_KNOWLEDGE.startupSupport);
    }

    if (includesAny(message, ['legal advice', 'tax advice', 'financial advice', 'professional advice', 'compliance advice'])) {
        addSection('professionalAdvice', 'Professional advice limitation',
            'RRC Nexus AI must not provide professional legal, tax, financial, or similar advice. It may explain that RRC Nexus offers relevant support/services, but the visitor should contact the appropriate professional.');
    }

    if (includesAny(message, ['booking', 'book', 'reserve', 'reservation', 'availability', 'available'])) {
        addSection('booking', 'Approved booking information', {
            ...RRC_NEXUS_KNOWLEDGE.booking,
            contactGuidance: 'Direct the visitor to the appropriate website booking/enquiry form. The form opens WhatsApp; the enquiry is not a confirmed booking. No live availability or payment processing is available.'
        });
    }

    if (includesAny(message, ['free visit', 'visit', 'tour', 'walkthrough', 'walk through'])) {
        addSection('freeVisit', 'Approved free visit information', RRC_NEXUS_KNOWLEDGE.freeVisit);
    }

    const asksPhone = includesAny(message, ['phone', 'telephone', 'call number', 'contact number']);
    const asksContact = includesAny(message, ['contact', 'email', 'reach']);
    const asksLocation = includesAny(message, ['address', 'location', 'where are you', 'where is', 'directions']);
    if (asksPhone || asksContact || asksLocation) {
        const contact = {
            email: RRC_NEXUS_KNOWLEDGE.contact.email,
            contactGuidance: RRC_NEXUS_KNOWLEDGE.contact.contactGuidance
        };
        if (asksLocation) {
            contact.address = RRC_NEXUS_KNOWLEDGE.contact.address;
        }
        if (asksPhone) {
            contact.phoneInstruction = 'Phone number is not approved for AI responses because conflicting website numbers exist. Direct the visitor to support@rrcnexus.com or the website contact/enquiry option.';
        }
        addSection('contact', 'Approved contact and location information', contact);
    }

    if (includesAny(message, [
        'rrc nexus', 'coworking', 'coworking space', 'workspace',
        'startup hub', 'freelancers', 'remote workers', 'students',
        'professionals', 'entrepreneurs'
    ])) {
        addSection('business', 'Approved business information', RRC_NEXUS_KNOWLEDGE.business);
    }

    if (includesAny(message, ['workshop', 'hackathon', 'startup meetup', 'seminar', 'networking', 'community event'])) {
        addSection('community', 'Approved community information', RRC_NEXUS_KNOWLEDGE.community);
    }

    if (topics.length === 0) {
        return { topics: [], context: '' };
    }

    return {
        topics,
        context: sections.join('\n\n')
    };
}

function resolveDeterministicAnswer(userMessage) {
    if (typeof userMessage !== 'string') {
        return null;
    }

    const message = normalize(userMessage);
    if (!message) {
        return null;
    }

    const knowledge = RRC_NEXUS_KNOWLEDGE;
    const safeFallback = "I don't have confirmed information about that in the RRC Nexus information available to me. Please use the website enquiry option to confirm it with the team.";
    const asksPrice = includesAny(message, ['price', 'pricing', 'cost', 'how much', 'rate', 'charge']);
    const asksNightOwl = includesAny(message, ['night owl']);

    const asksProfessionalAdvice = (
        includesAny(message, [
            'legal advice', 'tax advice', 'financial advice', 'compliance advice',
            'legal interpretation', 'tax interpretation', 'professional legal interpretation',
            'professional tax interpretation', 'personalized compliance advice',
            'legally valid', 'is it legal'
        ]) ||
        (
            includesAny(message, ['should i', 'how should i', 'what should i', 'can you advise', 'advise me']) &&
            includesAny(message, ['legal', 'law', 'tax', 'gst', 'financial', 'llp', 'register', 'compliance', 'company structure'])
        )
    );
    if (asksProfessionalAdvice) {
        return 'I can share general information about RRC Nexus services, but I cannot provide professional legal, tax, financial, or compliance advice. Please consult a qualified professional.';
    }

    if (includesAny(message, [
        'phone', 'telephone', 'mobile', 'contact number', 'call number', 'your number',
        'number for rrc nexus', 'rrc nexus number',
        'can i call you', 'how do i call', 'what number can i call', 'number to call',
        'whatsapp number', 'whats app number', 'wa number', 'whatsapp contact', 'contact you on whatsapp'
    ]) || /\b(can|could) i call\b/.test(message)) {
        return 'Our phone/contact number is currently being verified. Please use support@rrcnexus.com or the website enquiry options for the latest contact route.';
    }

    const mentionsSpace = includesAny(message, [
        'desk', 'desks', 'cabin', 'cabins', 'meeting room', 'meeting rooms',
        'conference room', 'workspace', 'workstation', 'seat', 'seats', 'room', 'rooms'
    ]);
    const asksAvailability = includesAny(message, ['availability']) ||
        (includesAny(message, ['available']) && (
            mentionsSpace ||
            /\b(now|today|tonight|tomorrow)\b/.test(message)
        )) ||
        /\b(what|anything)\b.*\b(available|free)\b.*\b(today|tomorrow|now|tonight)\b/.test(message);
    const asksFacilityAvailability = includesAny(message, ['facilities', 'facility', 'amenities', 'amenity']);
    if (asksAvailability && !asksFacilityAvailability) {
        return "RRC Nexus does not currently have a live availability system connected to this chatbot, so I can't confirm current availability. Please use the website enquiry/booking option to check with the team.";
    }

    if (asksNightOwl) {
        if (asksPrice) {
            return `RRC Nexus lists Night Owl access from ${knowledge.nightOwl.hours} with a stated ${knowledge.nightOwl.offer}. The exact applicable Night Owl price should be confirmed with RRC Nexus.`;
        }
        return `RRC Nexus describes Night Owl access as ${knowledge.nightOwl.hours}, with ${knowledge.nightOwl.offer}. Listed facilities include ${knowledge.nightOwl.includes.join(', ')}.`;
    }

    const planAliases = [
        { name: 'Day Pass', terms: ['day pass', 'daily pass', 'day plan'] },
        { name: 'Weekly Plan', terms: ['weekly plan', 'weekly pass'] },
        { name: 'Student Desk', terms: ['student desk', 'student plan'] },
        { name: 'Hot Desk', terms: ['hot desk', 'hotdesk'] },
        { name: 'Dedicated Desk', terms: ['dedicated desk', 'fixed desk'] },
        { name: 'Private Cabin', terms: ['private cabin', 'office cabin', 'cabin'] },
        { name: 'Meeting Room', terms: ['meeting room', 'conference room'] },
        { name: 'Virtual Office', terms: ['virtual office'] }
    ];
    const requestedPlans = planAliases.filter(plan => includesAny(message, plan.terms));
    const requestedPlan = requestedPlans.length === 1 ? requestedPlans[0] : null;
    const asksDayPassPrice = (requestedPlan?.name === 'Day Pass' &&
        (asksPrice || includesAny(message, ['i want', 'want a', 'get a']))) ||
        (/\b(one|a|single)\s+day\b/.test(message) && asksPrice);
    if (asksDayPassPrice) {
        const dayPass = knowledge.workspacePlans.find(plan => plan.name === 'Day Pass');
        return `Day Pass is listed at ${dayPass.price}.`;
    }

    if (requestedPlan && asksPrice) {
        const plan = knowledge.workspacePlans.find(plan => plan.name === requestedPlan.name);
        if (plan) {
            return `${plan.name} is listed at ${plan.price}.`;
        }
    }

    const asksFreelancerPlan = includesAny(message, ['freelancer', 'freelancers']) &&
        includesAny(message, ['which plan', 'what plan', 'what workspace options', 'workspace options', 'suit', 'suitable', 'recommend']);
    if (asksFreelancerPlan) {
        const plans = knowledge.workspacePlans.filter(plan => plan.suitableFor?.includes('freelancers'));
        const options = plans.map(plan => `${plan.name} (${plan.price})`).join(' and ');
        return `The website lists these plans as suitable for freelancers: ${options}. It does not specify which is best for an individual visitor.`;
    }

    if (
        includesAny(message, ['hot desk']) &&
        includesAny(message, ['dedicated desk']) &&
        includesAny(message, ['difference', 'compare', 'comparison', 'versus', 'vs'])
    ) {
        const hotDesk = knowledge.workspacePlans.find(plan => plan.name === 'Hot Desk');
        const dedicatedDesk = knowledge.workspacePlans.find(plan => plan.name === 'Dedicated Desk');
        return `Hot Desk: ${hotDesk.price}; listed for ${hotDesk.suitableFor.join(' and ')}; benefits are ${hotDesk.benefits.join(', ')}. Dedicated Desk: ${dedicatedDesk.price}; listed for ${dedicatedDesk.suitableFor.join(' and ')}; benefits are ${dedicatedDesk.benefits.join(', ')}.`;
    }

    if (includesAny(message, [
        'payment', 'make a payment', 'can i pay', 'pay through the chatbot',
        'pay through chatbot', 'pay here', 'pay online', 'payment went through',
        'payment status', 'payment method', 'process my payment', 'process payment',
        'charge my card', 'charge me', 'process my card', 'transaction', 'refund'
    ])) {
        return 'I cannot process or confirm payments. Please use the website enquiry option to contact the RRC Nexus team. I do not have confirmed information about payment methods, taxes, deposits, or refunds.';
    }

    const asksFreeVisit = includesAny(message, [
        'free visit', 'visit rrc nexus', 'visit the workspace', 'can i visit', 'how can i visit',
        'how do i visit', 'tour', 'workspace visit'
    ]);
    const asksBookingAction = !asksFreeVisit && (
        includesAny(message, [
            'confirm my booking', 'cancel my booking', 'change my booking',
            'modify my booking', 'manage my booking', 'book for me', 'reserve for me',
            'book me', 'cancel my reservation', 'change my reservation',
            'modify my reservation', 'make the reservation', 'make a reservation'
        ]) ||
        /^(book|reserve|cancel|change|modify|confirm)\b/.test(message) ||
        /\b(can|could|would) (you|i) (please )?(book|reserve)\b/.test(message) ||
        /\b(can|could|would) you (please )?(make|create) (the )?(booking|reservation)\b/.test(message) ||
        /\b(i want to|please) (book|reserve)\b/.test(message) ||
        (includesAny(message, ['book', 'reserve', 'reservation']) &&
            includesAny(message, ['meeting room', 'conference room', 'room', 'desk', 'cabin', 'booking']))
    );
    if (asksBookingAction) {
        return 'I can provide information, but I cannot create or confirm bookings or reservations. You can submit an enquiry through the website booking/enquiry option; an enquiry is not a confirmed booking.';
    }

    const asksUnsupportedBusinessFact =
        (includesAny(message, ['capacity', 'how many people', 'how many persons']) && includesAny(message, ['meeting room', 'conference room'])) ||
        (includesAny(message, ['tax', 'taxes', 'gst']) && includesAny(message, ['included', 'include', 'including', 'extra', 'tax inclusive', 'before tax', 'after tax', 'tax amount'])) ||
        includesAny(message, ['security deposit', 'deposit', 'cancellation policy', 'refund policy', 'today event schedule', 'event schedule today', 'who is working at reception', 'receptionist today', 'staff at reception today', 'google maps', 'google map', 'map location']);
    if (asksUnsupportedBusinessFact) {
        return safeFallback;
    }

    if (
        includesAny(message, ['how do i book', 'how can i book', 'booking process', 'how to book', 'can i book']) &&
        !includesAny(message, ['tour', 'free visit'])
    ) {
        if (includesAny(message, ['meeting room', 'conference room'])) {
            return `${knowledge.meetingRoom.enquiry.process} The form requests ${knowledge.meetingRoom.enquiry.collects.join(', ')}. Submitting an enquiry does not confirm a reservation.`;
        }
        return `${knowledge.booking.process} Submitting an enquiry does not confirm a booking, and this chatbot cannot check live availability.`;
    }

    if (includesAny(message, ['address', 'where is rrc nexus', 'where are you located', 'your location', 'directions to rrc nexus'])) {
        return `RRC Nexus is located at ${knowledge.contact.address}.`;
    }

    if (includesAny(message, ['email', 'email address', 'contact email', 'support email'])) {
        return `You can contact RRC Nexus at ${knowledge.contact.email}.`;
    }

    if (asksFreeVisit) {
        return `RRC Nexus provides a free-visit/tour enquiry option so visitors can ${knowledge.freeVisit.purpose.join(' and ')}. The enquiry is not a confirmed appointment.`;
    }

    const asksBusinessOverview =
        includesAny(message, [
            'what is rrc nexus', 'what does rrc nexus do', 'who is rrc nexus',
            'what rrc nexus does', 'what rrc nexus actually does', 'tell me what rrc nexus does',
            'tell me about rrc nexus', 'tell me about coworking at rrc nexus',
            'what does rrc nexus offer', 'what services does rrc nexus offer'
        ]) ||
        /what does rrc nexus actually do/.test(message);
    const asksUnsupportedBusinessBenefits =
        (includesAny(message, ['why should i', 'why would i', 'what are the benefits', 'what advantages']) &&
            includesAny(message, ['rrc nexus', 'coworking', 'workspace']));
    if (asksUnsupportedBusinessBenefits) {
        return safeFallback;
    }

    if (asksBusinessOverview) {
        return `${knowledge.business.description} It provides ${knowledge.business.provides.join(', ')}. ${knowledge.business.mission}`;
    }

    if (includesAny(message, ['does rrc nexus support startups', 'does rrc nexus support startup', 'does rrc nexus help startups'])) {
        return 'Yes. RRC Nexus lists startup support among its services and aims to build a startup ecosystem in Thanjavur.';
    }

    const asksFacilities = includesAny(message, ['facilities', 'facility', 'amenities', 'amenity', 'what does rrc nexus provide', 'what do you provide']);
    if (asksFacilities) {
        return `RRC Nexus lists facilities including ${knowledge.facilities.join(', ')}. These are site-listed facilities and are not necessarily included with every individual plan.`;
    }

    if (requestedPlan && includesAny(message, ['include', 'included', 'comes with', 'come with'])) {
        const plan = knowledge.workspacePlans.find(entry => entry.name === requestedPlan.name);
        const benefits = requestedPlan.name === 'Meeting Room'
            ? knowledge.meetingRoom.benefits
            : plan && plan.benefits;
        const requestedBenefit = benefits && benefits.find(benefit =>
            includesAny(message, [benefit])
        );
        if (requestedBenefit) {
            return `The published ${plan.name} information lists ${requestedBenefit} as a benefit.`;
        }
        if (
            requestedPlan.name === 'Meeting Room' &&
            includesAny(message, ['what is included', 'what does the meeting room include', 'what does meeting room include'])
        ) {
            const meetingRoom = knowledge.meetingRoom;
            return `Published Meeting Room features include ${meetingRoom.benefits.join(', ')}.`;
        }
        return safeFallback;
    }

    if (requestedPlans.length > 1) {
        return null;
    }

    if (requestedPlan && includesAny(message, ['tell me about', 'describe', 'what is', 'what are', 'details'])) {
        const plan = knowledge.workspacePlans.find(entry => entry.name === requestedPlan.name);
        if (plan && requestedPlan.name === 'Hot Desk') {
            return `The Hot Desk is listed at ${plan.price} for freelancers and remote workers. Published benefits are ${plan.benefits.join(', ')}.`;
        }
        if (plan && requestedPlan.name === 'Private Cabin') {
            const cabin = knowledge.privateCabin;
            return `The Private Cabin is listed at ${cabin.price}. It is an office for ${cabin.capacity}, with ${cabin.benefits.join(' and ')}. It is listed as suitable for startups, entrepreneurs, and small teams.`;
        }
    }

    if (includesAny(message, ['startup']) && includesAny(message, ['desk', 'workspace', 'office'])) {
        const hotDesk = knowledge.workspacePlans.find(plan => plan.name === 'Hot Desk');
        const dedicatedDesk = knowledge.workspacePlans.find(plan => plan.name === 'Dedicated Desk');
        const cabin = knowledge.privateCabin;
        return `Published options include Hot Desk at ${hotDesk.price} for freelancers and remote workers, Dedicated Desk at ${dedicatedDesk.price} for professionals, and Private Cabin at ${cabin.price} for startups, entrepreneurs, and small teams. The available information does not identify a desk plan specifically for startups.`;
    }

    if (includesAny(message, ['startup support', 'startup help', 'startup services', 'support for startups', 'help for startups'])) {
        const support = knowledge.startupSupport;
        return `RRC Nexus lists legal/compliance support through ${support.legalCompliance.join(', ')}, technical/software support through ${support.technicalSoftware.join(', ')}, and these services: ${support.otherServices.join(', ')}. This chatbot does not provide legal, tax, financial, or other professional advice.`;
    }

    const asksMeetingRoomDetails = includesAny(message, ['meeting room', 'conference room']) &&
        includesAny(message, ['facilities', 'amenities', 'features', 'include', 'included', 'what is', 'tell me about', 'do you have']);
    if (asksMeetingRoomDetails) {
        const meetingRoom = knowledge.meetingRoom;
        return `The Meeting Room is listed at ${meetingRoom.price}. Published features include ${meetingRoom.benefits.join(', ')}. A room enquiry is not a confirmed reservation, and this chatbot cannot check live availability.`;
    }

    const asksPrivateCabinDetails = includesAny(message, ['private cabin', 'office cabin']) &&
        includesAny(message, ['capacity', 'features', 'facilities', 'what is', 'tell me about', 'how many']);
    if (asksPrivateCabinDetails) {
        const cabin = knowledge.privateCabin;
        return `The Private Cabin is listed at ${cabin.price}. It is an office for ${cabin.capacity}, with ${cabin.benefits.join(' and ')}.`;
    }

    return null;
}

module.exports = { retrieveKnowledge, resolveDeterministicAnswer };
