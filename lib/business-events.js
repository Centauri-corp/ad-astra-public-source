'use strict';
// Validates inbound business events BEFORE persistence or external side effects.
// Production must separately verify webhook signatures, auth and uniqueness atomically.
const TYPES = Object.freeze({
  'lead.created':['leadId','source','consentState','lawfulContactBasis'],
  'lead.qualified':['leadId','ownerId','scoringVersion'],
  'demo.booked':['leadId','bookingReference','ownerId'],
  'contract.signed':['contractReference','legalEntity','signatoryId'],
  'invoice.paid':['providerEventId','billingCustomerId','amountMinor','currency'],
  'customer.activated':['customerId','identityId','entitlementReference'],
  'subscription.renewed':['subscriptionId','providerEventId']
});
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/;
function validateEvent(event) {
 if (!event || typeof event!=='object' || Array.isArray(event)) return {ok:false,reason:'invalid_event'};
 for(const key of ['type','schemaVersion','tenantId','eventId','idempotencyKey','occurredAt','producer','traceId']) {
   if (typeof event[key]!=='string' || event[key].length>256 || !event[key].trim()) return {ok:false,reason:'missing_'+key};
 }
 if (event.schemaVersion!=='1.0' || !Object.hasOwn(TYPES,event.type)) return {ok:false,reason:'unsupported_schema'};
 if (![event.tenantId,event.eventId,event.idempotencyKey,event.producer,event.traceId].every(v=>ID.test(v))) return {ok:false,reason:'invalid_identifier'};
 if (!Number.isFinite(Date.parse(event.occurredAt)) || !/Z$/.test(event.occurredAt)) return {ok:false,reason:'invalid_timestamp'};
 if (!event.payload || typeof event.payload!=='object' || Array.isArray(event.payload)) return {ok:false,reason:'invalid_payload'};
 for(const field of TYPES[event.type]) if (typeof event.payload[field]!=='string' && !(field==='amountMinor' && Number.isSafeInteger(event.payload[field]) && event.payload[field]>=0)) return {ok:false,reason:'missing_payload_'+field};
 if (event.type==='invoice.paid' && !/^[A-Z]{3}$/.test(event.payload.currency)) return {ok:false,reason:'invalid_currency'};
 if (event.type==='lead.created' && !['granted','denied','unknown'].includes(event.payload.consentState)) return {ok:false,reason:'invalid_consent'};
 return {ok:true,reason:'valid'};
}
function idempotencyScope(event){const result=validateEvent(event); if(!result.ok) throw new Error(result.reason);return [event.tenantId,event.producer,event.idempotencyKey].join(':');}
module.exports={TYPES,validateEvent,idempotencyScope};
