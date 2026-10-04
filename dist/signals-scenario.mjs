import {addAssessment,stageDocument} from './threat-core.mjs';

// Entirely authored controls for demonstrating uncertainty and false alarms.
// No real district, organization, event, source or intelligence claim.
export function regionalScenario(workspace) {
  if(workspace.assessments.some(c=>['regional-training-r7','regional-training-context'].includes(c.id)))throw new Error('This fictional regional scenario is already present. Existing work is retained.');
  const at='2026-10-05',base={judgment:'',gaps:'Compare a genuine warning, a recycled rumor and routine maintenance as competing explanations. Reporter identity, source independence, timing and attribution remain unresolved. Do not infer intent from a keyword or geographic proximity.',confidence:'Insufficient',priority:'Priority review',status:'Needs review',reviewNote:'',citedEvidence:[],asOf:at};
  let next=addAssessment(workspace,{...base,id:'regional-training-r7',title:'Regional uncertainty — fictional Sector R-7',area:'Training Sector R-7 / fictional area in India',scope:'Domestic',question:'Do these fictional reports warrant authorized verification, and what evidence would distinguish a warning from rumor or routine activity?'},at);
  next=addAssessment(next,{...base,id:'regional-training-context',title:'Shared reporting — fictional international context',area:'Training Region X-4 / fictional overseas area',scope:'International',question:'Is this a separate development or a repost of the same fictional reporting? No actor or causal connection is established.'},at);
  const common={publisher:'Authored fictional publisher',url:'',reportedAt:'2026-10-03',recordedAt:'2026-10-05',language:'English',locator:'Authored training paragraph',accessNote:'Fictional development fixture. No real publisher or event. Authorized for this prototype demonstration.',synthetic:true};
  const rows=[
    {id:'regional-training-original',assessmentId:'regional-training-r7',title:'Unverified warning — authored control',originGroup:'regional-training-report-A',excerpt:'FICTIONAL EXERCISE: A helpdesk receives an unverified report alleging a threat near a fictional facility in Sector R-7. Reporter identity, timing and cause are unknown. The allegation is not confirmed.'},
    {id:'regional-training-repost',assessmentId:'regional-training-r7',title:'Reposted warning — duplicate-source control',originGroup:'regional-training-report-A',excerpt:'FICTIONAL EXERCISE: A second outlet repeats the same unverified threat allegation from the helpdesk report. It supplies no independent observation or confirmation.'},
    {id:'regional-training-alternative',assessmentId:'regional-training-r7',title:'Routine activity — benign and negation control',originGroup:'regional-training-report-B',excerpt:'FICTIONAL EXERCISE: A fictional operator reports routine scheduled maintenance in Sector R-7 and says no threat was observed. This does not prove the allegation false; verify both accounts and their timing.'},
    {id:'regional-training-overseas',assessmentId:'regional-training-context',title:'Overseas repost — cross-case reporting control',originGroup:'regional-training-report-A',excerpt:'FICTIONAL EXERCISE: An overseas discussion repeats the Sector R-7 threat allegation from the same original report. Reposting across regions does not establish a common actor, a separate incident or independent corroboration.'}
  ];
  for(const row of rows)next=stageDocument(next,{...common,...row},at);
  return next;
}
