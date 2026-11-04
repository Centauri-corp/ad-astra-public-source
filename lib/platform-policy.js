'use strict';
// Pure policy functions. No configuration flag can grant authorization by itself.
const HIGH_RISK = new Set(['production.promote','agent.external_action','billing.refund','marketing.send','ads.activate','secrets.rotate','research.export','intercompany.share']);
const ROLE_PERMISSIONS = Object.freeze({
  viewer:['audit.read','task.read'],
  customer:['task.read','intelligence.request'],
  support:['task.read','customer.support'],
  sales:['crm.read','crm.update','task.read'],
  editor:['content.draft','content.review'],
  engineer:['deploy.stage','task.read','audit.read'],
  approver:['approval.decide','audit.read'],
  security:['security.review','audit.read'],
  finance:['billing.read','budget.review','audit.read'],
  admin:['team.manage','task.read','audit.read']
});
function authorize({principal,action,resource,approval}) {
  if (!principal || principal.active !== true || !principal.subject || !resource || !resource.tenantId || !action) return {allowed:false,reason:'invalid_context'};
  if (principal.tenantId !== resource.tenantId) return {allowed:false,reason:'tenant_mismatch'};
  if (!ROLE_PERMISSIONS[principal.role]?.includes(action) && !HIGH_RISK.has(action)) return {allowed:false,reason:'permission_denied'};
  if (HIGH_RISK.has(action)) {
    if (!approval || approval.action !== action || approval.tenantId !== resource.tenantId || approval.state !== 'approved' || approval.requester === approval.approver || approval.approver === principal.subject || !approval.evidenceId) return {allowed:false,reason:'independent_approval_required'};
    if (!principal.delegatedActions?.includes(action)) return {allowed:false,reason:'delegation_required'};
  }
  return {allowed:true,reason:'authorized'};
}
module.exports={authorize,ROLE_PERMISSIONS,HIGH_RISK};
