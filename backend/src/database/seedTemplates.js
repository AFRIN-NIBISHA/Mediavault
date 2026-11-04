import { query } from './db.js';

export const DEFAULT_TEMPLATES = [
  {
    name: 'Instagram Post Creator',
    category: 'social',
    width: 1080,
    height: 1080,
    description: 'Square 1:1 modern social feed post layout with stylish typography and accent shapes.',
    template_data: {
      backgroundColor: '#f8fafc',
      layers: [
        {
          id: 'bg-card',
          type: 'shape',
          shapeType: 'rect',
          name: 'Main Backdrop Card',
          x: 60,
          y: 60,
          width: 960,
          height: 960,
          fill: '#ffffff',
          stroke: '#e2e8f0',
          strokeWidth: 2,
          cornerRadius: 32,
          shadowBlur: 25,
          shadowColor: 'rgba(147, 51, 234, 0.1)',
          opacity: 1
        },
        {
          id: 'accent-tag',
          type: 'shape',
          shapeType: 'rect',
          name: 'Category Pill',
          x: 120,
          y: 140,
          width: 180,
          height: 44,
          fill: '#f3e8ff',
          cornerRadius: 22,
          opacity: 1
        },
        {
          id: 'accent-tag-text',
          type: 'text',
          name: 'Tag Label',
          x: 145,
          y: 152,
          text: 'DESIGN SPOTLIGHT',
          fontSize: 14,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#9333ea',
          opacity: 1
        },
        {
          id: 'headline-1',
          type: 'text',
          name: 'Hero Headline',
          x: 120,
          y: 220,
          text: 'ELEVATE YOUR\nDIGITAL VISION',
          fontSize: 64,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          lineHeight: 1.15,
          fill: '#0f172a',
          opacity: 1
        },
        {
          id: 'subtext-1',
          type: 'text',
          name: 'Description Subtitle',
          x: 120,
          y: 400,
          text: 'Craft stunning visual experiences with high-fidelity asset rendering and AI-powered intelligence.',
          fontSize: 24,
          fontFamily: 'Inter',
          fontStyle: 'normal',
          width: 600,
          fill: '#64748b',
          opacity: 1
        },
        {
          id: 'accent-circle',
          type: 'shape',
          shapeType: 'circle',
          name: 'Purple Glow Orb',
          x: 780,
          y: 720,
          radius: 180,
          fill: '#9333ea',
          opacity: 0.12
        },
        {
          id: 'cta-pill',
          type: 'shape',
          shapeType: 'rect',
          name: 'CTA Button',
          x: 120,
          y: 840,
          width: 240,
          height: 60,
          fill: '#9333ea',
          cornerRadius: 16,
          opacity: 1
        },
        {
          id: 'cta-text',
          type: 'text',
          name: 'CTA Text',
          x: 170,
          y: 858,
          text: 'Explore Studio →',
          fontSize: 20,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#ffffff',
          opacity: 1
        }
      ]
    }
  },
  {
    name: 'Instagram Story Creator',
    category: 'social',
    width: 1080,
    height: 1920,
    description: '9:16 vertical full-screen story canvas optimized for mobile immersion.',
    template_data: {
      backgroundColor: '#0f172a',
      layers: [
        {
          id: 'story-accent-1',
          type: 'shape',
          shapeType: 'circle',
          name: 'Top Violet Orb',
          x: 200,
          y: 300,
          radius: 350,
          fill: '#a855f7',
          opacity: 0.25
        },
        {
          id: 'story-headline',
          type: 'text',
          name: 'Story Headline',
          x: 100,
          y: 450,
          text: 'DISCOVER\nTHE NEW\nSTANDARD',
          fontSize: 88,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          lineHeight: 1.1,
          fill: '#ffffff',
          opacity: 1
        },
        {
          id: 'story-subtext',
          type: 'text',
          name: 'Story Caption',
          x: 100,
          y: 800,
          text: 'Next-generation AI photography & multi-layer creative design at your fingertips.',
          fontSize: 32,
          fontFamily: 'Inter',
          width: 880,
          fill: '#cbd5e1',
          opacity: 1
        },
        {
          id: 'swipe-up-pill',
          type: 'shape',
          shapeType: 'rect',
          name: 'Swipe Action Card',
          x: 140,
          y: 1650,
          width: 800,
          height: 100,
          fill: '#ffffff',
          cornerRadius: 50,
          opacity: 0.95
        },
        {
          id: 'swipe-text',
          type: 'text',
          name: 'Swipe Text',
          x: 390,
          y: 1682,
          text: 'Swipe Up to Learn More',
          fontSize: 26,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#0f172a',
          opacity: 1
        }
      ]
    }
  },
  {
    name: 'YouTube Thumbnail Maker',
    category: 'social',
    width: 1280,
    height: 720,
    description: '16:9 high-CTR thumbnail template with bold headline badges and high-contrast styling.',
    template_data: {
      backgroundColor: '#0c0714',
      layers: [
        {
          id: 'thumb-glow',
          type: 'shape',
          shapeType: 'circle',
          name: 'Purple Center Glow',
          x: 950,
          y: 360,
          radius: 320,
          fill: '#9333ea',
          opacity: 0.35
        },
        {
          id: 'badge-pill',
          type: 'shape',
          shapeType: 'rect',
          name: 'Alert Badge Pill',
          x: 80,
          y: 80,
          width: 220,
          height: 54,
          fill: '#e11d48',
          cornerRadius: 14,
          opacity: 1
        },
        {
          id: 'badge-text',
          type: 'text',
          name: 'Badge Text',
          x: 110,
          y: 94,
          text: '🔴 ULTRA 4K AI',
          fontSize: 22,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#ffffff',
          opacity: 1
        },
        {
          id: 'main-title',
          type: 'text',
          name: 'Clickable Title',
          x: 80,
          y: 170,
          text: 'SECRET AI TOOLS\nYOU MUST TRY!',
          fontSize: 84,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          lineHeight: 1.1,
          fill: '#ffffff',
          opacity: 1
        },
        {
          id: 'sub-callout',
          type: 'shape',
          shapeType: 'rect',
          name: 'Highlight Box',
          x: 80,
          y: 420,
          width: 480,
          height: 80,
          fill: '#facc15',
          cornerRadius: 16,
          opacity: 1
        },
        {
          id: 'sub-callout-text',
          type: 'text',
          name: 'Highlight Text',
          x: 110,
          y: 442,
          text: '100% FREE & INSTANT',
          fontSize: 34,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#0f172a',
          opacity: 1
        }
      ]
    }
  },
  {
    name: 'Poster Designer',
    category: 'marketing',
    width: 1200,
    height: 1600,
    description: 'Elegant vertical event or exhibition poster with architectural layout grid.',
    template_data: {
      backgroundColor: '#f1f5f9',
      layers: [
        {
          id: 'poster-border',
          type: 'shape',
          shapeType: 'rect',
          name: 'Outer Frame',
          x: 50,
          y: 50,
          width: 1100,
          height: 1500,
          fill: '#ffffff',
          stroke: '#cbd5e1',
          strokeWidth: 2,
          cornerRadius: 24,
          opacity: 1
        },
        {
          id: 'poster-year',
          type: 'text',
          name: 'Year Label',
          x: 120,
          y: 120,
          text: 'ANNUAL TECH SYMPOSIUM 2026',
          fontSize: 20,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#9333ea',
          opacity: 1
        },
        {
          id: 'poster-title',
          type: 'text',
          name: 'Event Title',
          x: 120,
          y: 200,
          text: 'MEDIAVAULT\nCONFERENCE',
          fontSize: 90,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          lineHeight: 1.05,
          fill: '#0f172a',
          opacity: 1
        },
        {
          id: 'poster-divider',
          type: 'shape',
          shapeType: 'line',
          name: 'Divider Line',
          x: 120,
          y: 440,
          width: 960,
          stroke: '#9333ea',
          strokeWidth: 4,
          opacity: 1
        },
        {
          id: 'poster-info',
          type: 'text',
          name: 'Event Details',
          x: 120,
          y: 500,
          text: 'FEATURING GLOBAL ARCHITECTS & AI VISION LEADERS\nDECEMBER 14-16 • AUDITORIUM HALL A',
          fontSize: 26,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          lineHeight: 1.5,
          fill: '#475569',
          opacity: 1
        }
      ]
    }
  },
  {
    name: 'Invitation Card Designer',
    category: 'personal',
    width: 1050,
    height: 1485,
    description: 'Refined celebration and wedding invitation with luxury borders and cursive aesthetics.',
    template_data: {
      backgroundColor: '#fbf9f5',
      layers: [
        {
          id: 'card-border',
          type: 'shape',
          shapeType: 'rect',
          name: 'Gold Inset Border',
          x: 60,
          y: 60,
          width: 930,
          height: 1365,
          fill: 'transparent',
          stroke: '#d97706',
          strokeWidth: 3,
          cornerRadius: 16,
          opacity: 0.8
        },
        {
          id: 'inv-header',
          type: 'text',
          name: 'Header Intro',
          x: 280,
          y: 200,
          text: 'YOU ARE CORDIALLY INVITED TO CELEBRATE',
          fontSize: 18,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#78350f',
          opacity: 0.9
        },
        {
          id: 'inv-names',
          type: 'text',
          name: 'Names Highlight',
          x: 210,
          y: 350,
          text: 'Sarah & David',
          fontSize: 76,
          fontFamily: 'serif',
          fontStyle: 'italic',
          fill: '#92400e',
          opacity: 1
        },
        {
          id: 'inv-date',
          type: 'text',
          name: 'Date & Time',
          x: 320,
          y: 580,
          text: 'SATURDAY, OCTOBER 24TH\nAT FIVE O\'CLOCK IN THE EVENING',
          fontSize: 22,
          fontFamily: 'Inter',
          lineHeight: 1.6,
          fill: '#451a03',
          opacity: 1
        }
      ]
    }
  },
  {
    name: 'ID Card Photo Creator',
    category: 'identity',
    width: 600,
    height: 900,
    description: 'Standard institutional and corporate badge template with barcode and credential sections.',
    template_data: {
      backgroundColor: '#ffffff',
      layers: [
        {
          id: 'badge-header',
          type: 'shape',
          shapeType: 'rect',
          name: 'Top Header Bar',
          x: 0,
          y: 0,
          width: 600,
          height: 140,
          fill: '#9333ea',
          opacity: 1
        },
        {
          id: 'corp-name',
          type: 'text',
          name: 'Organization Name',
          x: 40,
          y: 50,
          text: 'MEDIAVAULT CORP',
          fontSize: 28,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#ffffff',
          opacity: 1
        },
        {
          id: 'photo-frame',
          type: 'shape',
          shapeType: 'rect',
          name: 'Portrait Photo Placeholder',
          x: 160,
          y: 190,
          width: 280,
          height: 350,
          fill: '#f1f5f9',
          stroke: '#cbd5e1',
          strokeWidth: 2,
          cornerRadius: 16,
          opacity: 1
        },
        {
          id: 'id-name',
          type: 'text',
          name: 'Employee Name',
          x: 160,
          y: 580,
          text: 'Alex Vance',
          fontSize: 34,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#0f172a',
          opacity: 1
        },
        {
          id: 'id-role',
          type: 'text',
          name: 'Job Title',
          x: 160,
          y: 630,
          text: 'Senior Software Architect',
          fontSize: 20,
          fontFamily: 'Inter',
          fill: '#9333ea',
          fontStyle: 'bold',
          opacity: 1
        },
        {
          id: 'id-number',
          type: 'text',
          name: 'Badge ID',
          x: 160,
          y: 680,
          text: 'ID: MV-8920491 • EXP: 2028',
          fontSize: 16,
          fontFamily: 'monospace',
          fill: '#64748b',
          opacity: 1
        }
      ]
    }
  },
  {
    name: 'Passport Size Photo Creator',
    category: 'identity',
    width: 413,
    height: 531,
    description: 'Official 35mm x 45mm (413x531 px at 300DPI) biometric passport photo guideline canvas.',
    template_data: {
      backgroundColor: '#f8fafc',
      layers: [
        {
          id: 'passport-frame',
          type: 'shape',
          shapeType: 'rect',
          name: 'Biometric Box',
          x: 20,
          y: 20,
          width: 373,
          height: 491,
          fill: '#ffffff',
          stroke: '#e2e8f0',
          strokeWidth: 2,
          opacity: 1
        },
        {
          id: 'head-oval-guide',
          type: 'shape',
          shapeType: 'circle',
          name: 'Head Proportion Guide',
          x: 206,
          y: 220,
          radius: 120,
          fill: 'transparent',
          stroke: '#9333ea',
          strokeWidth: 1,
          dash: [6, 6],
          opacity: 0.5
        },
        {
          id: 'guide-label',
          type: 'text',
          name: 'Instruction Label',
          x: 100,
          y: 470,
          text: '35 × 45 mm (Biometric Spec)',
          fontSize: 14,
          fontFamily: 'Inter',
          fill: '#64748b',
          opacity: 0.8
        }
      ]
    }
  },
  {
    name: 'Profile Picture Maker',
    category: 'personal',
    width: 800,
    height: 800,
    description: 'Circular cropped avatar studio with background gradient rings and clean badge offsets.',
    template_data: {
      backgroundColor: '#ffffff',
      layers: [
        {
          id: 'avatar-outer-ring',
          type: 'shape',
          shapeType: 'circle',
          name: 'Outer Gradient Ring',
          x: 400,
          y: 400,
          radius: 360,
          fill: '#f3e8ff',
          stroke: '#9333ea',
          strokeWidth: 8,
          opacity: 1
        },
        {
          id: 'avatar-inner',
          type: 'shape',
          shapeType: 'circle',
          name: 'Profile Base',
          x: 400,
          y: 400,
          radius: 340,
          fill: '#ede9fe',
          opacity: 1
        },
        {
          id: 'status-pill',
          type: 'shape',
          shapeType: 'circle',
          name: 'Active Status Dot',
          x: 620,
          y: 620,
          radius: 36,
          fill: '#10b981',
          stroke: '#ffffff',
          strokeWidth: 6,
          opacity: 1
        }
      ]
    }
  },
  {
    name: 'Product Image Designer',
    category: 'marketing',
    width: 1200,
    height: 1200,
    description: 'E-commerce showcase canvas with spotlight podium, price badge, and feature highlights.',
    template_data: {
      backgroundColor: '#f8fafc',
      layers: [
        {
          id: 'podium-shadow',
          type: 'shape',
          shapeType: 'circle',
          name: 'Pedestal Shadow',
          x: 600,
          y: 850,
          radius: 380,
          fill: '#0f172a',
          opacity: 0.06
        },
        {
          id: 'product-brand',
          type: 'text',
          name: 'Brand Name',
          x: 100,
          y: 100,
          text: 'PREMIUM COLLECTION',
          fontSize: 20,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#9333ea',
          opacity: 1
        },
        {
          id: 'product-name',
          type: 'text',
          name: 'Product Title',
          x: 100,
          y: 140,
          text: 'Pro Studio Audio Headset',
          fontSize: 48,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#0f172a',
          opacity: 1
        },
        {
          id: 'price-pill',
          type: 'shape',
          shapeType: 'rect',
          name: 'Price Badge',
          x: 950,
          y: 100,
          width: 150,
          height: 60,
          fill: '#10b981',
          cornerRadius: 16,
          opacity: 1
        },
        {
          id: 'price-text',
          type: 'text',
          name: 'Price Text',
          x: 980,
          y: 118,
          text: '$299',
          fontSize: 28,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#ffffff',
          opacity: 1
        }
      ]
    }
  },
  {
    name: 'Custom Banner Creator',
    category: 'marketing',
    width: 1920,
    height: 600,
    description: 'Ultra-wide header banner for LinkedIn, web landing pages, or promotional campaigns.',
    template_data: {
      backgroundColor: '#0c0714',
      layers: [
        {
          id: 'banner-glow-1',
          type: 'shape',
          shapeType: 'circle',
          name: 'Purple Glow Left',
          x: 200,
          y: 300,
          radius: 300,
          fill: '#9333ea',
          opacity: 0.25
        },
        {
          id: 'banner-glow-2',
          type: 'shape',
          shapeType: 'circle',
          name: 'Violet Glow Right',
          x: 1700,
          y: 300,
          radius: 350,
          fill: '#c084fc',
          opacity: 0.15
        },
        {
          id: 'banner-headline',
          type: 'text',
          name: 'Banner Main Headline',
          x: 140,
          y: 160,
          text: 'TRANSFORM ASSETS WITH NEXT-GEN AI',
          fontSize: 56,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#ffffff',
          opacity: 1
        },
        {
          id: 'banner-subtitle',
          type: 'text',
          name: 'Banner Subtitle',
          x: 140,
          y: 260,
          text: 'Unified Digital Asset Management • Multi-Layer Photo Studio • AI Creative Engineering',
          fontSize: 24,
          fontFamily: 'Inter',
          fill: '#cbd5e1',
          opacity: 1
        },
        {
          id: 'banner-button',
          type: 'shape',
          shapeType: 'rect',
          name: 'Banner CTA Button',
          x: 140,
          y: 340,
          width: 220,
          height: 60,
          fill: '#9333ea',
          cornerRadius: 16,
          opacity: 1
        },
        {
          id: 'banner-button-text',
          type: 'text',
          name: 'Button Label',
          x: 185,
          y: 358,
          text: 'Get Started Now',
          fontSize: 20,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#ffffff',
          opacity: 1
        }
      ]
    }
  }
];

export async function seedTemplates() {
  try {
    for (const t of DEFAULT_TEMPLATES) {
      const existing = await query('SELECT id FROM image_templates WHERE name = $1', [t.name]);
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO image_templates (name, category, width, height, description, template_data, is_public)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [t.name, t.category, t.width, t.height, t.description, JSON.stringify(t.template_data)]
        );
      }
    }
    console.log(`✓ Seeded ${DEFAULT_TEMPLATES.length} Creative Design Templates.`);
  } catch (err) {
    console.error('Error seeding templates:', err.message);
  }
}

