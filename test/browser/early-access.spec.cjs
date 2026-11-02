'use strict';
const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:4173';
const endpoint='https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-early-access';

async function installFixture(page,{status=200,body={ok:true,message:'Early access request received.'}}={}){
  const posts=[];
  await page.route('**/*',async route=>{
    const request=route.request();
    const url=request.url();
    if(url.startsWith(base))return route.continue();
    if(url===endpoint){
      const headers={
        'Access-Control-Allow-Origin':base,
        'Access-Control-Allow-Methods':'POST, OPTIONS',
        'Access-Control-Allow-Headers':'content-type',
        'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'no-store',
      };
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
      posts.push(JSON.parse(request.postData()||'{}'));
      return route.fulfill({status,headers,body:JSON.stringify(body)});
    }
    return route.abort('blockedbyclient');
  });
  return posts;
}

test('early-access request is consented, bounded and confirms success',async({page})=>{
  const posts=await installFixture(page);
  await page.goto('/access/');
  const intake=page.getByRole('form',{name:'Request early access'});
  await expect(intake).toBeVisible();
  await page.getByLabel('Full name Optional').fill('Astra Test');
  await page.getByLabel('Company or organization Optional').fill('Centauri Test');
  await page.getByLabel('Work email').fill('launch@example.com');
  await page.getByLabel(/I agree to receive AD ASTRA/).check();
  await page.getByRole('button',{name:'Request early access'}).click();
  await expect(page.getByRole('status')).toContainText('early-access request was received');
  expect(posts).toEqual([{email:'launch@example.com',full_name:'Astra Test',company:'Centauri Test',website:'',consent:true}]);
  await expect(page.getByLabel('Work email')).toHaveValue('');
  await expect(page.getByRole('button',{name:'Request early access'})).toBeEnabled();
});

test('rate limiting leaves the intake recoverable without exposing provider detail',async({page})=>{
  const posts=await installFixture(page,{status:429,body:{ok:false,error:'rate_limited'}});
  await page.goto('/access/');
  await page.getByLabel('Work email').fill('retry@example.com');
  await page.getByLabel(/I agree to receive AD ASTRA/).check();
  await page.getByRole('button',{name:'Request early access'}).click();
  await expect(page.getByRole('status')).toContainText('Too many requests');
  expect(posts).toHaveLength(1);
  await expect(page.getByLabel('Work email')).toHaveValue('retry@example.com');
  await expect(page.getByRole('button',{name:'Request early access'})).toBeEnabled();
});
