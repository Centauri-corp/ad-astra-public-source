#!/usr/bin/env node
'use strict';
const {collectReadiness}=require('../lib/pipeline-integrations.cjs');
collectReadiness().then(report=>{
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(process.argv.includes('--strict')&&report.blockers.length)process.exitCode=2;
}).catch(()=>{process.stderr.write('integration_readiness_unavailable\n');process.exitCode=2;});
