const test=require('node:test'),assert=require('node:assert/strict');
const {createSession}=require('../public/companion/state.js');
test('conversation context is opt-in and never crosses an account or tenant change',()=>{
 const session=createSession();session.setScope('session-a:customer-a:tenant-a');
 session.complete('Explain solar storage','A sample response.');assert.equal(session.snapshot().turns,0);
 session.setRemember(true);session.complete('Explain solar storage','A sample response.');
 assert.match(session.question('What about night time?'),/Explain solar storage/);
 session.setScope('session-a:customer-a:tenant-b');assert.equal(session.snapshot().turns,0);
 assert.doesNotMatch(session.question('What about night time?'),/Explain solar storage/);
 session.setScope(null);assert.throws(()=>session.question('What about night time?'),/authentication_required/);
});
test('context and communication style remain within the existing gateway question budget',()=>{
 const session=createSession();session.setScope('signed-in');session.setRemember(true);
 for(let i=0;i<8;i++)session.complete('q'.repeat(2000),'a'.repeat(6000));
 const question=session.question('x'.repeat(2000));assert.ok(question.length<=4000);assert.equal(session.snapshot().turns,2);
 assert.match(question,/not independently verified evidence/);
 session.setTone('concise');assert.match(session.question('Please explain this'),/concise, direct/);
 assert.throws(()=>session.setTone('diagnose-my-emotions'),/invalid_tone/);
});
test('turning memory off clears existing context and empty or excessive questions fail locally',()=>{
 const session=createSession();session.setScope('signed-in');session.setRemember(true);session.complete('First question','First answer');
 session.setRemember(false);assert.equal(session.snapshot().turns,0);
 assert.doesNotMatch(session.question('Second question'),/First answer/);
 assert.throws(()=>session.question('tiny'),/invalid_question/);assert.throws(()=>session.question('x'.repeat(2001)),/invalid_question/);
});
