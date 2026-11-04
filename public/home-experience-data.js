'use strict';
(() => {
const PRODUCT_FAMILIES = [
    {
      id: 'core-intelligence',
      index: '01',
      label: 'Guided preview',
      title: 'Core Intelligence',
      summary: 'Ask better questions, trace evidence, learn faster and turn complex subjects into clearer next steps.',
      features: ['Ask', 'Research', 'Learn', 'Career', 'Life'],
      href: '/knowledge/',
      cta: 'Open the knowledge workspace'
    },
    {
      id: 'creative-studio',
      index: '02',
      label: 'Planned',
      title: 'Creative Studio',
      summary: 'Develop concepts, images, motion, voice, web experiences and documents through governed creative workflows.',
      features: ['Image', 'Video', 'Voice', 'Web', 'Documents'],
      href: '/products/',
      cta: 'Explore the product direction'
    },
    {
      id: 'specialist-intelligence',
      index: '03',
      label: 'Research direction',
      title: 'Specialist Intelligence',
      summary: 'Evidence-aware experiences for science, space, engineering, health knowledge, legal information and civic research.',
      features: ['Science', 'Space', 'Engineering', 'Health knowledge', 'Civic'],
      href: '/resources/',
      cta: 'Explore the resource network'
    },
    {
      id: 'business-commerce',
      index: '04',
      label: 'Planned',
      title: 'Business & Commerce',
      summary: 'Support customer operations, sales, CRM, marketing, analytics and commerce with human-supervised intelligence.',
      features: ['Support', 'Sales', 'CRM', 'Marketing', 'Data'],
      href: '/markets/',
      cta: 'Explore business solutions'
    },
    {
      id: 'developer-platform',
      index: '05',
      label: 'Planned',
      title: 'Developer Platform',
      summary: 'Build governed applications through APIs, SDK guidance, webhooks, usage controls and model-gateway contracts.',
      features: ['APIs', 'SDKs', 'Webhooks', 'Usage', 'Model gateway'],
      href: '/platform/',
      cta: 'Review the platform direction'
    },
    {
      id: 'autonomous-workflows',
      index: '06',
      label: 'Private development',
      title: 'Autonomous Workflows',
      summary: 'Design bounded agents and AI employees with durable tasks, explicit approvals and complete execution evidence.',
      features: ['Agent Studio', 'AI Employees', 'Approvals', 'Orchestration', 'Audit'],
      href: '/platform/',
      cta: 'Review governed automation'
    }
  ];
const SOLUTIONS = [
    {
      id: 'research-knowledge',
      audience: ['individual', 'team', 'enterprise', 'science'],
      title: 'Research & Knowledge',
      summary: 'Search, compare and explain evidence across trusted public resources, private knowledge and connected disciplines.',
      outcomes: ['Source-grounded research', 'Knowledge synthesis', 'Learning paths'],
      href: '/resources/'
    },
    {
      id: 'creative-production',
      audience: ['individual', 'creator', 'team'],
      title: 'Creative Production',
      summary: 'Move from idea to narrative, visual direction, motion study, document and digital experience.',
      outcomes: ['Concept development', 'Visual systems', 'Content workflows'],
      href: '/products/'
    },
    {
      id: 'customer-operations',
      audience: ['business', 'enterprise'],
      title: 'Customer Operations',
      summary: 'Design supervised support, sales, scheduling and CRM workflows without hiding approval or accountability.',
      outcomes: ['Support intelligence', 'Sales workflows', 'CRM readiness'],
      href: '/markets/business-professional-services/'
    },
    {
      id: 'enterprise-intelligence',
      audience: ['team', 'business', 'enterprise'],
      title: 'Enterprise Intelligence',
      summary: 'Connect organizational knowledge, policy, audit, identity and integration controls in one governed workspace.',
      outcomes: ['Private knowledge', 'Policy controls', 'Audit visibility'],
      href: '/platform/'
    },
    {
      id: 'earth-space',
      audience: ['individual', 'science', 'enterprise', 'public'],
      title: 'Earth & Space Intelligence',
      summary: 'Explore satellite, climate, astronomy, planetary and scientific resources with provenance and domain safeguards.',
      outcomes: ['Earth observation', 'Space research', 'Climate intelligence'],
      href: '/resources/'
    },
    {
      id: 'engineering-industry',
      audience: ['business', 'enterprise', 'science', 'public'],
      title: 'Engineering & Industry',
      summary: 'Support materials, manufacturing, energy, terrain and infrastructure research while preserving professional review.',
      outcomes: ['Engineering research', 'Industrial analysis', 'Geotechnology'],
      href: '/markets/manufacturing-energy/'
    }
  ];
const MODEL_MODES = {
    knowledge: {
      label: 'KNOWLEDGE GRAPH',
      title: 'Connected evidence across disciplines.',
      description: 'A spherical field of source, concept and reasoning nodes. The visual represents how one question can connect multiple knowledge domains.',
      accent: '#8ee8f4'
    },
    agents: {
      label: 'AGENT ORCHESTRATION',
      title: 'Human-directed workflows with visible control.',
      description: 'A double-helix field representing task planning, approvals, tool boundaries and execution evidence.',
      accent: '#9a7cff'
    },
    earth: {
      label: 'EARTH + SPACE INTELLIGENCE',
      title: 'Scientific resources in an orbital context.',
      description: 'A layered orbital model representing Earth observation, climate, astronomy and planetary research pathways.',
      accent: '#f2c879'
    }
  };
window.AD_ASTRA_HOME_DATA = Object.freeze({PRODUCT_FAMILIES, SOLUTIONS, MODEL_MODES});
})();
