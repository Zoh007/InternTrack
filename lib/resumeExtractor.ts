/**
 * Resume Extractor - Hybrid Regex + GPT Pipeline
 * Step 1: Try regex patterns (fast, free)
 * Step 2: Fall back to GPT for complex/ambiguous cases (accurate, costs money)
 */

export interface ExtractedResume {
  // Contact Information
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  
  // Education
  education?: Array<{
    degree?: string;
    school?: string;
    major?: string;
    graduationDate?: string;
    gpa?: string;
  }>;
  
  // Skills
  skills?: string[];
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  
  // Experience
  experience?: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    description?: string;
    achievements?: string[];
  }>;
  
  // Projects
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    link?: string;
  }>;
  
  // Metadata
  extractionMethod: 'regex' | 'gpt' | 'hybrid';
  confidence: number; // 0-1
  missingFields: string[];
}

/**
 * Extract contact information using regex patterns
 */
export function extractContactRegex(text: string): Partial<ExtractedResume> {
  console.log('[extractor] Extracting contact info with regex...');
  const result: Partial<ExtractedResume> = {};
  
  // Email pattern
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    result.email = emailMatch[0];
    console.log(`[extractor] ✓ Found email: ${result.email}`);
  }
  
  // Phone patterns (various formats)
  const phonePatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // 123-456-7890
    /\(\d{3}\)\s?\d{3}[-.]?\d{4}/, // (123) 456-7890
    /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/, // +1-234-567-8900
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.phone = match[0].trim();
      console.log(`[extractor] ✓ Found phone: ${result.phone}`);
      break;
    }
  }
  
  // LinkedIn URL
  const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)[\w-]+/i);
  if (linkedinMatch) {
    result.linkedin = `https://${linkedinMatch[0]}`;
    console.log(`[extractor] ✓ Found LinkedIn: ${result.linkedin}`);
  }
  
  // GitHub URL
  const githubMatch = text.match(/(?:github\.com\/)[\w-]+/i);
  if (githubMatch) {
    result.github = `https://${githubMatch[0]}`;
    console.log(`[extractor] ✓ Found GitHub: ${result.github}`);
  }
  
  // Portfolio/Website URLs
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|org|net|io|dev|co|me|edu))/gi;
  const urlMatches = text.match(urlPattern);
  if (urlMatches) {
    // Filter out common non-portfolio domains
    const portfolioDomains = urlMatches.filter(url => 
      !url.includes('linkedin.com') && 
      !url.includes('github.com') &&
      !url.includes('gmail.com') &&
      !url.includes('outlook.com')
    );
    if (portfolioDomains.length > 0) {
      result.portfolio = portfolioDomains[0].startsWith('http') ? portfolioDomains[0] : `https://${portfolioDomains[0]}`;
      console.log(`[extractor] ✓ Found portfolio: ${result.portfolio}`);
    }
  }
  
  return result;
}

/**
 * Detect resume sections using regex patterns
 */
export function detectSectionsRegex(text: string): { [key: string]: { start: number; end: number } } {
  console.log('[extractor] Detecting sections with regex...');
  const sections: { [key: string]: { start: number; end: number } } = {};
  
  // Common section headers (case-insensitive)
  const sectionPatterns = {
    contact: /^(?:contact|contact information|personal information|personal details)$/i,
    education: /^(?:education|academic|academic background|academic qualifications)$/i,
    experience: /^(?:experience|work experience|employment|work history|professional experience|career)$/i,
    skills: /^(?:skills|technical skills|core competencies|competencies|abilities)$/i,
    projects: /^(?:projects|personal projects|side projects|project experience)$/i,
    certifications: /^(?:certifications|certificates|certification|licenses)$/i,
    awards: /^(?:awards|honors|achievements|recognition)$/i,
  };
  
  const lines = text.split('\n');
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Check if line matches a section header
    for (const [sectionName, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(trimmedLine)) {
        // Find the end of this section (next section header or end of text)
        let endIndex = text.length;
        for (let i = index + 1; i < lines.length; i++) {
          const nextLine = lines[i].trim();
          // Check if next line is another section header
          for (const [otherSection, otherPattern] of Object.entries(sectionPatterns)) {
            if (otherSection !== sectionName && otherPattern.test(nextLine)) {
              endIndex = text.indexOf(lines[i]);
              break;
            }
          }
          if (endIndex < text.length) break;
        }
        
        sections[sectionName] = {
          start: text.indexOf(line),
          end: endIndex,
        };
        console.log(`[extractor] ✓ Found section: ${sectionName} (lines ${index + 1}-${Math.floor(endIndex / 80)})`);
        break;
      }
    }
  });
  
  return sections;
}

/**
 * Extract skills using regex patterns (no keyword dictionary)
 * Uses pattern detection to find skills dynamically
 */
export function extractSkillsRegex(text: string, skillsSection?: string): string[] {
  console.log('[extractor] Extracting skills with regex (pattern-based, no keywords)...');
  const skills: string[] = [];
  
  // Use skills section if provided, otherwise search entire text
  const searchText = skillsSection || text;
  
  // Pattern 1: Bullet points or list items (common in skills sections)
  // Matches: "• Python", "- JavaScript", "• React.js"
  const bulletPattern = /(?:^|\n|•|\-|▪|▫)\s*([A-Z][a-zA-Z0-9.\s\+\#\-]{2,40}?)(?:\s*[•,\-|]|$|,)/gm;
  
  // Pattern 2: Comma-separated skills
  // Matches: "Python, JavaScript, React" or "Python,JavaScript,React"
  const commaPattern = /(?:^|\n|:)\s*([A-Z][a-zA-Z0-9.\s\+\#\-]{2,40}(?:\s*,\s*[A-Z][a-zA-Z0-9.\s\+\#\-]{2,40}){1,20})/gm;
  
  // Pattern 3: Skills with proficiency indicators
  // Matches: "Python (3 years)", "JavaScript - Expert", "React: Advanced"
  const proficiencyPattern = /([A-Z][a-zA-Z0-9.\s\+\#\-]{2,40}?)\s*(?:\(|:|\-)\s*(?:years?|experience|proficient|expert|advanced|intermediate|beginner|novice)/gi;
  
  // Pattern 4: Skills in parentheses or brackets
  // Matches: "(Python, JavaScript, React)" or "[AWS, Docker, Kubernetes]"
  const parenPattern = /[\(\[][A-Z][a-zA-Z0-9.\s\+\#\-,]{5,200}?[\)\]]/g;
  
  // Extract from bullet pattern
  const bulletMatches = searchText.matchAll(bulletPattern);
  for (const match of bulletMatches) {
    if (match[1] && match[1].trim().length > 2) {
      const skill = match[1].trim().replace(/[•,\-|]$/, '').trim();
      if (skill.length > 1 && skill.length < 50) {
        skills.push(skill);
      }
    }
  }
  
  // Extract from comma-separated lists
  const commaMatches = searchText.matchAll(commaPattern);
  for (const match of commaMatches) {
    if (match[1]) {
      const skillList = match[1].split(',').map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);
      skills.push(...skillList);
    }
  }
  
  // Extract from proficiency patterns
  const proficiencyMatches = searchText.matchAll(proficiencyPattern);
  for (const match of proficiencyMatches) {
    if (match[1] && match[1].trim().length > 2) {
      const skill = match[1].trim();
      if (skill.length < 50) {
        skills.push(skill);
      }
    }
  }
  
  // Extract from parentheses/brackets
  const parenMatches = searchText.matchAll(parenPattern);
  for (const match of parenMatches) {
    const content = match[0].replace(/[\(\)\[\]]/g, '');
    const skillList = content.split(',').map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);
    skills.push(...skillList);
  }
  
  // Clean up: Remove duplicates, filter out common non-skill words
  const nonSkills = ['and', 'or', 'the', 'with', 'years', 'experience', 'proficient', 'expert', 'advanced'];
  const uniqueSkills = [...new Set(skills.map(s => s.trim()))]
    .filter(s => {
      // Filter out very short or very long strings
      if (s.length < 2 || s.length > 50) return false;
      // Filter out common non-skill words
      if (nonSkills.includes(s.toLowerCase())) return false;
      // Filter out pure numbers or special characters
      if (/^[\d\s\-\.]+$/.test(s)) return false;
      return true;
    });
  
  console.log(`[extractor] ✓ Found ${uniqueSkills.length} skills with pattern-based regex`);
  if (uniqueSkills.length > 0) {
    console.log(`[extractor] Sample skills: ${uniqueSkills.slice(0, 5).join(', ')}`);
  }
  
  return uniqueSkills;
}

/**
 * Extract structured resume data using GPT (fallback for complex cases)
 */
export async function extractWithGPT(
  text: string,
  regexResults: Partial<ExtractedResume>
): Promise<Partial<ExtractedResume>> {
  console.log('[extractor] Falling back to GPT for complex extraction...');
  
  // Check if OpenAI is available (server-side only)
  if (typeof window !== 'undefined') {
    console.warn('[extractor] GPT extraction only works server-side');
    return {};
  }
  
  let openai: any = null;
  try {
    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      openai = new OpenAI({ apiKey });
    } else {
      console.warn('[extractor] OPENAI_API_KEY not found in environment variables');
      return {};
    }
  } catch (error) {
    console.warn('[extractor] OpenAI not available, skipping GPT extraction:', error);
    return {};
  }
  
  if (!openai) {
    console.warn('[extractor] OpenAI client not initialized');
    return {};
  }
  
  try {
    const prompt = `Extract structured information from this resume text. 
    
Resume Text:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

Already extracted with regex (use these if accurate):
${JSON.stringify(regexResults, null, 2)}

Extract and return a JSON object with these fields:
- name: Full name (if not already found)
- email: Email address (if not already found)
- phone: Phone number (if not already found)
- address: Full address or city, state
- linkedin: LinkedIn URL (if not already found)
- github: GitHub URL (if not already found)
- portfolio: Portfolio/website URL (if not already found)
- education: Array of {degree, school, major, graduationDate, gpa}
- skills: Array of technical and soft skills
- certifications: Array of {name, issuer, date}
- experience: Array of {company, title, startDate, endDate, location, description, achievements[]}
- projects: Array of {name, description, technologies[], link}

Return ONLY valid JSON, no markdown or extra text. Use the regex results if they are accurate.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a resume parser. Always return valid JSON only, no markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('No response from GPT');

    // Remove markdown code blocks if present
    const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const gptResults = JSON.parse(jsonText);
    
    console.log('[extractor] ✓ GPT extraction complete');
    return gptResults;
  } catch (error: any) {
    console.error('[extractor] GPT extraction error:', error);
    return {};
  }
}

/**
 * Main extraction function - Regex first, GPT fallback
 */
export async function extractResumeStructured(
  text: string
): Promise<ExtractedResume> {
  console.log('[extractor] ===== Starting Resume Extraction =====');
  console.log(`[extractor] Text length: ${text.length} characters`);
  
  const result: ExtractedResume = {
    extractionMethod: 'regex',
    confidence: 0,
    missingFields: [],
  };
  
  // Step 1: Extract contact info with regex (fast, free)
  const contactInfo = extractContactRegex(text);
  Object.assign(result, contactInfo);
  
  // Step 2: Detect sections with regex
  const sections = detectSectionsRegex(text);
  
  // Step 3: Extract skills from skills section (if found) or entire text
  const skillsSection = sections.skills 
    ? text.substring(sections.skills.start, sections.skills.end)
    : undefined;
  result.skills = extractSkillsRegex(text, skillsSection);
  
  // Step 4: Check what's missing - if critical fields missing, use GPT
  const criticalFields = ['name', 'email', 'experience', 'education'];
  const missingCritical = criticalFields.filter(field => !result[field as keyof ExtractedResume]);
  
  if (missingCritical.length > 0) {
    console.log(`[extractor] Missing critical fields: ${missingCritical.join(', ')}`);
    console.log(`[extractor] Falling back to GPT for: ${missingCritical.join(', ')}`);
    
    // Use GPT to fill in missing fields
    const gptResults = await extractWithGPT(text, result);
    
    // Merge GPT results (prefer regex results if they exist)
    Object.keys(gptResults).forEach(key => {
      if (!result[key as keyof ExtractedResume] && gptResults[key as keyof typeof gptResults]) {
        (result as any)[key] = gptResults[key as keyof typeof gptResults];
      }
    });
    
    result.extractionMethod = 'hybrid';
  }
  
  // Calculate confidence and missing fields
  const allFields = ['name', 'email', 'phone', 'education', 'skills', 'experience'];
  result.missingFields = allFields.filter(field => !result[field as keyof ExtractedResume]);
  result.confidence = 1 - (result.missingFields.length / allFields.length);
  
  console.log(`[extractor] Extraction complete: ${result.extractionMethod} method`);
  console.log(`[extractor] Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`[extractor] Missing fields: ${result.missingFields.join(', ') || 'none'}`);
  console.log('[extractor] ===== Extraction Complete =====');
  
  return result;
}

