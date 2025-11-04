import OpenAI from "openai";
import puppeteer, { Browser, Page, ElementHandle } from "puppeteer";

interface ResumeData {
  raw_text: string;
  additional_info?: string;
}

interface JobApplicationForm {
  fields: FormField[];
}

interface FormField {
  type: string; // 'text', 'textarea', 'select', 'radio', 'checkbox', 'file'
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  value?: string;
}

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[formFiller] OPENAI_API_KEY not set - form filling will use basic matching");
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Extract information from resume using AI
 */
export async function extractResumeInfo(resumeData: ResumeData, jobDescription: string): Promise<any> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    // Fallback: return basic structure
    return {
      name: extractName(resumeData.raw_text),
      email: extractEmail(resumeData.raw_text),
      phone: extractPhone(resumeData.raw_text),
      experience: extractExperience(resumeData.raw_text),
      skills: extractSkills(resumeData.raw_text),
      education: extractEducation(resumeData.raw_text),
    };
  }

  try {
    const prompt = `Extract structured information from this resume for a job application. 

Resume:
${resumeData.raw_text}

Additional Information:
${resumeData.additional_info || "None"}

Job Description:
${jobDescription}

Return a JSON object with these fields:
- name: Full name
- email: Email address
- phone: Phone number
- address: Address (city, state, zip)
- linkedin: LinkedIn URL if found
- portfolio: Portfolio/website URL if found
- experience_years: Years of experience as number
- current_title: Current job title
- skills: Array of skills
- education: Array of education entries with degree, school, year
- summary: Professional summary (2-3 sentences)

Return ONLY valid JSON, no markdown or extra text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that extracts structured data from resumes. Always return valid JSON only." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // Remove markdown code blocks if present
    const jsonText = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("[formFiller] AI extraction error:", error);
    // Fallback to basic extraction
    return {
      name: extractName(resumeData.raw_text),
      email: extractEmail(resumeData.raw_text),
      phone: extractPhone(resumeData.raw_text),
      experience: extractExperience(resumeData.raw_text),
      skills: extractSkills(resumeData.raw_text),
      education: extractEducation(resumeData.raw_text),
    };
  }
}

/**
 * Use AI to determine how to fill a form field
 */
export async function determineFieldValue(
  field: FormField,
  resumeInfo: any,
  jobDescription: string
): Promise<string | null> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    return matchFieldBasic(field, resumeInfo);
  }

  try {
    const prompt = `Given this form field and resume information, determine the best value to fill in.

Form Field:
- Label: ${field.label || "N/A"}
- Name: ${field.name || "N/A"}
- Placeholder: ${field.placeholder || "N/A"}
- Type: ${field.type}
- Options: ${field.options ? field.options.join(", ") : "N/A"}

Resume Information:
${JSON.stringify(resumeInfo, null, 2)}

Job Description:
${jobDescription.substring(0, 500)}

Based on the field label, name, and placeholder, determine the most appropriate value from the resume information. 
If it's a dropdown/select with options, choose the closest matching option.
Return ONLY the value to fill in, nothing else. If no match, return "null".`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You help fill job application forms. Return only the value to fill, or 'null' if no match." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 100,
    });

    const value = completion.choices[0].message.content?.trim();
    if (!value || value === "null" || value.toLowerCase() === "null") {
      return matchFieldBasic(field, resumeInfo);
    }
    return value;
  } catch (error) {
    console.error("[formFiller] AI field matching error:", error);
    return matchFieldBasic(field, resumeInfo);
  }
}

/**
 * Fill out a job application form using Puppeteer
 */
export async function fillApplicationForm(
  jobUrl: string,
  resumeInfo: any,
  resumeFilePath: string,
  jobDescription: string,
  onScreenshot?: (screenshot: string, step: string) => Promise<void>, // Callback for screenshots
  headless: boolean = true // Run in visible browser mode when false
): Promise<{ success: boolean; error?: string; screenshots?: Array<{ step: string; url: string }> }> {
  let browser: Browser | null = null;
  const screenshots: Array<{ step: string; url: string }> = [];

  try {
    browser = await puppeteer.launch({
      headless: headless,
      args: headless 
        ? ["--no-sandbox", "--disable-setuid-sandbox"]
        : [
            "--no-sandbox", 
            "--disable-setuid-sandbox", 
            "--start-maximized", 
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
            "--window-size=1920,1080"
          ],
      defaultViewport: headless ? { width: 1920, height: 1080 } : null, // Use default viewport in headed mode
    });
    
    if (!headless) {
      console.log("[formFiller] ✅ Browser window should be visible now! Watch it fill the form...");
    }

    const page = await browser.newPage();
    if (headless) {
      await page.setViewport({ width: 1920, height: 1080 });
    }
    
    // Set realistic user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Add extra headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });
    
    // Set a longer timeout for headed mode so user can see what's happening
    page.setDefaultTimeout(headless ? 30000 : 60000);
    
    // Suppress noisy console warnings from Puppeteer and pdf2json
    page.on('console', (msg) => {
      const text = msg.text();
      // Filter out known harmless warnings
      if (
        text.includes('Unsupported: field.type of Link') ||
        text.includes('NOT valid form element') ||
        text.includes('Setting up fake worker')
      ) {
        // Suppress these warnings
        return;
      }
      // Log other console messages at debug level
      if (msg.type() === 'error') {
        console.warn('[formFiller] Browser console error:', text);
      }
    });
    
    // Helper function to capture and send screenshot
    const captureScreenshot = async (step: string) => {
      try {
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
        const dataUrl = `data:image/png;base64,${screenshot}`;
        screenshots.push({ step, url: dataUrl });
        if (onScreenshot) {
          await onScreenshot(dataUrl, step);
        }
      } catch (error) {
        console.warn(`[formFiller] Failed to capture screenshot for step: ${step}`, error);
      }
    };

    // Navigate to job URL
    console.log(`[formFiller] Navigating to ${jobUrl} (headless=${headless})`);
    
    // Add random delay before navigation to avoid rate limiting (1-3 seconds)
    const preNavDelay = Math.floor(Math.random() * 2000) + 1000;
    await new Promise(resolve => setTimeout(resolve, preNavDelay));
    
    await page.goto(jobUrl, { waitUntil: "networkidle2", timeout: 30000 });
    
    // Wait longer in headed mode so user can see the page load
    if (!headless) {
      console.log("[formFiller] Page loaded. Waiting 3 seconds so you can see it...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Wait a bit for dynamic content to load (longer delay to avoid rate limiting)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for potential form elements to appear (give it more time for dynamic content)
    try {
      await page.waitForSelector('input, textarea, select, form', { timeout: 5000 });
    } catch (e) {
      console.warn("[formFiller] No form elements found after waiting");
    }

    // Detect form fields
    const formFields = await detectFormFields(page);
    
    console.log(`[formFiller] Detected ${formFields.length} form fields`);
    
    if (!headless && formFields.length > 0) {
      console.log("[formFiller] Form detected. Starting to fill fields in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // If no fields detected, wait a bit more and try again (for heavily JS-rendered pages)
    if (formFields.length === 0) {
      console.warn("[formFiller] No fields detected initially, waiting for dynamic content...");
      if (!headless) {
        console.log("[formFiller] Waiting 5 seconds for dynamic content to load...");
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
      const retryFields = await detectFormFields(page);
      if (retryFields.length > 0) {
        formFields.push(...retryFields);
        console.log(`[formFiller] Found ${formFields.length} fields on retry`);
        if (!headless) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Fill each field
    if (formFields.length > 0) {
      console.log(`[formFiller] Filling ${formFields.length} form fields...`);
      for (let i = 0; i < formFields.length; i++) {
        const field = formFields[i];
        try {
          const value = await determineFieldValue(field, resumeInfo, jobDescription);
          if (value && value !== "null") {
            if (!headless) {
              console.log(`[formFiller] 📝 Filling field ${i + 1}/${formFields.length}: ${field.label || field.name || field.type} with value: ${value.substring(0, 50)}...`);
            }
            // In headed mode, type slower so user can watch
            await fillField(page, field, value, resumeFilePath, headless);
            // Longer delay in headed mode so user can see each field being filled
            // Also add random variation to avoid rate limiting
            const baseDelay = headless ? 500 : 2000; // Increased from 1500 to 2000 for better visibility
            const randomDelay = Math.floor(Math.random() * 500) + 200; // 200-700ms random
            const delay = baseDelay + randomDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            if (!headless) {
              console.log(`[formFiller] ✅ Field ${i + 1} filled successfully!`);
            }
            
            // Random mouse movement to look more human (optional, but helps avoid detection)
            if (!headless) {
              try {
                await page.mouse.move(
                  Math.random() * 100 + 100,
                  Math.random() * 100 + 100
                );
              } catch (e) {
                // Ignore mouse movement errors
              }
            }
          } else {
            if (!headless) {
              console.log(`[formFiller] ⚠️ Skipping field ${i + 1}: ${field.label || field.name || field.type} (no value found)`);
            }
          }
        } catch (error) {
          console.error(`[formFiller] Error filling field ${field.label || field.name}:`, error);
        }
      }
      // Pause after filling all fields so user can review
      if (!headless) {
        console.log("[formFiller] ✅ All fields filled! Keeping browser open for 5 seconds so you can review...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } else {
      console.warn("[formFiller] No form fields to fill - might be a redirect or external application");
      if (!headless) {
        console.log("[formFiller] No form detected. Browser will stay open so you can check manually.");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Wait before submitting to avoid rate limiting
    console.log("[formFiller] Waiting 2 seconds before attempting to submit...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to submit the form
    if (!headless) {
      console.log("[formFiller] 🔘 Attempting to submit the form...");
    }
    const submitted = await attemptSubmit(page);
    
    // In headed mode, keep browser open longer so user can see the result
    if (!headless) {
      if (submitted) {
        console.log("[formFiller] ✅ Form submitted successfully! Keeping browser open for 15 seconds so you can verify...");
        await new Promise(resolve => setTimeout(resolve, 15000));
      } else {
        console.log("[formFiller] ⚠️ Could not auto-submit. Keeping browser open for 20 seconds so you can submit manually...");
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
      console.log("[formFiller] Closing browser in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      // In headless mode, just a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await browser.close();
    
    if (!headless) {
      console.log("[formFiller] ✅ Browser closed. Application process complete!");
    }
    
    return {
      success: submitted,
      error: submitted ? undefined : "Could not submit form automatically",
      screenshots: screenshots,
    };
  } catch (error) {
    console.error("[formFiller] Application error:", error);
    
    // Try to capture a screenshot of the error state before closing
    if (browser) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
          const errorScreenshot = await pages[0].screenshot({ encoding: 'base64', fullPage: false });
          const dataUrl = `data:image/png;base64,${errorScreenshot}`;
          screenshots.push({ step: "Error State", url: dataUrl });
          if (onScreenshot) {
            await onScreenshot(dataUrl, "Error State").catch(() => {});
          }
        }
      } catch (screenshotError) {
        console.warn("[formFiller] Could not capture error screenshot:", screenshotError);
      }
      
      // In headed mode, keep browser open so user can see what went wrong
      if (!headless) {
        console.log("[formFiller] Error occurred. Keeping browser open for 10 seconds...");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      await browser.close();
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      screenshots: screenshots.length > 0 ? screenshots : undefined,
    };
  }
}

/**
 * Detect form fields on the page
 */
async function detectFormFields(page: Page): Promise<FormField[]> {
  return await page.evaluate(() => {
    const fields: FormField[] = [];
    
    // Find all input, textarea, select elements
    const inputs = document.querySelectorAll("input, textarea, select");
    
    inputs.forEach((el) => {
      const element = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const type = element.tagName.toLowerCase();
      const inputType = element.getAttribute("type") || "";
      
      // Skip hidden fields and submit buttons
      if (inputType === "hidden" || inputType === "submit" || inputType === "button") return;
      
      const field: FormField = {
        type: type === "select" ? "select" : inputType || "text",
        name: element.getAttribute("name") || undefined,
        label: getLabelForElement(element) || undefined,
        placeholder: element.getAttribute("placeholder") || undefined,
        required: element.hasAttribute("required"),
      };

      if (type === "select") {
        const select = element as HTMLSelectElement;
        field.options = Array.from(select.options).map((opt) => opt.text);
      }

      fields.push(field);
    });

    function getLabelForElement(element: Element): string | null {
      // Try to find associated label
      const id = element.getAttribute("id");
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent?.trim() || null;
      }

      // Look for label parent
      const labelParent = element.closest("label");
      if (labelParent) return labelParent.textContent?.trim().split("\n")[0] || null;

      // Look for nearby text
      const parent = element.parentElement;
      if (parent) {
        const labelText = parent.querySelector("label, .label, [class*='label']");
        if (labelText) return labelText.textContent?.trim() || null;
      }

      return null;
    }

    return fields;
  }) as FormField[];
}

/**
 * Fill a single form field
 */
async function fillField(page: Page, field: FormField, value: string, resumeFilePath: string, headless: boolean = true): Promise<void> {
  if (field.type === "file") {
    // Handle file upload
    if (!resumeFilePath || resumeFilePath === "") {
      console.warn("[formFiller] Resume file not available for upload");
      return;
    }
    try {
      const fileInput = await page.$(`input[type="file"]${field.name ? `[name="${field.name}"]` : ""}`);
      if (fileInput) {
        await fileInput.uploadFile(resumeFilePath);
      }
    } catch (error) {
      console.warn("[formFiller] Could not upload resume file:", error);
    }
    return;
  }

  // Try multiple approaches to find and fill the field
  let filled = false;
  
  // Method 1: Try by name attribute
  if (field.name && !filled) {
    const selectors = [
      `[name="${field.name}"]`,
      `input[name="${field.name}"], textarea[name="${field.name}"], select[name="${field.name}"]`
    ];
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await fillFieldElement(element, value, page, headless);
          filled = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  // Method 2: Try by label text (find label, then associated input)
  if (field.label && !filled) {
    const cleanLabel = field.label.replace(/[*+#]/g, '').trim().toLowerCase();
    
    const success = await page.evaluate((labelText, val) => {
      // Find all labels
      const labels = Array.from(document.querySelectorAll('label'));
      
      for (const label of labels) {
        const labelTextContent = label.textContent?.toLowerCase().trim() || '';
        if (labelTextContent.includes(labelText)) {
          // Try to find input by 'for' attribute
          const forAttr = label.getAttribute('for');
          if (forAttr) {
            const input = document.getElementById(forAttr) || document.querySelector(`[name="${forAttr}"]`);
            if (input) {
              const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.focus();
              element.value = '';
              
              if (element.tagName === 'SELECT') {
                (element as HTMLSelectElement).value = val;
              } else {
                element.value = val;
              }
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          
          // Find input inside label
          const inputInLabel = label.querySelector('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (inputInLabel) {
            inputInLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputInLabel.focus();
            inputInLabel.value = '';
            
            if (inputInLabel.tagName === 'SELECT') {
              (inputInLabel as HTMLSelectElement).value = val;
            } else {
              inputInLabel.value = val;
            }
            inputInLabel.dispatchEvent(new Event('input', { bubbles: true }));
            inputInLabel.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
      }
      
      // Try placeholder match
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const input of inputs) {
        const placeholder = (input as HTMLInputElement).placeholder?.toLowerCase() || '';
        if (placeholder.includes(labelText)) {
          const element = input as HTMLInputElement | HTMLTextAreaElement;
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
          element.value = '';
          element.value = val;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      
      return false;
    }, cleanLabel, value);
    
    if (success) {
      filled = true;
      if (!headless) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  
  if (!filled) {
    console.warn(`[formFiller] Could not fill field ${field.label || field.name}`);
  }
  
  // Helper function to fill a field element
  async function fillFieldElement(element: any, val: string, page: Page, headless: boolean) {
    await element.evaluate((el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      el.value = '';
      
      if (el.tagName === 'SELECT') {
        (el as HTMLSelectElement).value = val;
      } else {
        (el as HTMLInputElement | HTMLTextAreaElement).value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    if (!headless) {
      try {
        await page.keyboard.type(val, { delay: 100 });
      } catch (e) {
        // If typing fails, that's okay, value is already set
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

/**
 * Attempt to submit the form
 */
async function attemptSubmit(page: Page): Promise<boolean> {
  try {
    // First, try standard CSS selectors for submit buttons
    let submitButton: ElementHandle<Element> | null = await page.$("button[type='submit'], input[type='submit']");
    
    // If not found, try to find buttons by text content using evaluate
    if (!submitButton) {
      const buttonHandle = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a[role="button"]'));
        const submitWords = ['submit', 'apply', 'send', 'continue', 'next', 'save'];
        
        for (const btn of buttons) {
          const text = (btn.textContent || '').toLowerCase().trim();
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const className = btn.className || '';
          
          if (submitWords.some(word => 
            text.includes(word) || 
            ariaLabel.toLowerCase().includes(word) ||
            className.toLowerCase().includes(word)
          )) {
            return btn;
          }
        }
        return null;
      });
      
      if (buttonHandle) {
        const element = buttonHandle.asElement();
        if (element) {
          // Cast to ElementHandle<Element> since we know it's an Element from querySelector
          submitButton = element as ElementHandle<Element>;
        } else {
          await buttonHandle.dispose();
        }
      }
    }
    
    if (submitButton) {
      // Scroll button into view first
      await submitButton.evaluate((el) => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      
      // Wait for button to be visible and clickable
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try multiple click methods
      try {
        await submitButton.click({ delay: 100 });
      } catch (e) {
        // If click fails, try JavaScript click
        try {
          await submitButton.evaluate((el: any) => el.click());
        } catch (e2) {
          // If that fails, try dispatching event
          await submitButton.evaluate((el: any) => {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          });
        }
      }
      
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
      return true;
    }

    // Try finding form and submitting it
    const form = await page.$('form');
    if (form) {
      try {
        await form.evaluate((formEl) => {
          (formEl as HTMLFormElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await new Promise(resolve => setTimeout(resolve, 300));
        await form.evaluate((formEl) => {
          (formEl as HTMLFormElement).requestSubmit();
        });
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
        return true;
      } catch (e) {
        console.warn("[formFiller] Form submit failed:", e);
      }
    }

    // Last resort: try pressing Enter
    await page.keyboard.press("Enter");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    console.error("[formFiller] Submit error:", error);
    return false;
  }
}

// Basic extraction functions (fallback when AI is not available)
function extractName(text: string): string {
  const lines = text.split("\n").slice(0, 5);
  return lines[0]?.trim() || "";
}

function extractEmail(text: string): string {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const match = text.match(emailRegex);
  return match ? match[0] : "";
}

function extractPhone(text: string): string {
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
  const match = text.match(phoneRegex);
  return match ? match[0] : "";
}

function extractExperience(text: string): string {
  const experienceRegex = /(\d+)\+?\s*(years?|yrs?)\s*(?:of\s*)?experience/i;
  const match = text.match(experienceRegex);
  return match ? match[1] : "0";
}

function extractSkills(text: string): string[] {
  const skillsSection = text.match(/(?:skills?:?|technologies?:?)\s*:?\s*([^\n]+(?:\n[^\n]+){0,10})/i);
  if (skillsSection) {
    return skillsSection[1]
      .split(/[,;•\-\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 20);
  }
  return [];
}

function extractEducation(text: string): string[] {
  const educationSection = text.match(/(?:education?:?)\s*:?\s*([^\n]+(?:\n[^\n]+){0,10})/i);
  if (educationSection) {
    return [educationSection[1].trim()];
  }
  return [];
}

function matchFieldBasic(field: FormField, resumeInfo: any): string | null {
  const fieldText = `${field.label || ""} ${field.name || ""} ${field.placeholder || ""}`.toLowerCase();

  if (fieldText.includes("email")) return resumeInfo.email || "";
  if (fieldText.includes("phone") || fieldText.includes("tel")) return resumeInfo.phone || "";
  if (fieldText.includes("name") && !fieldText.includes("last") && !fieldText.includes("first")) {
    return resumeInfo.name || "";
  }
  if (fieldText.includes("first name")) return resumeInfo.name?.split(" ")[0] || "";
  if (fieldText.includes("last name")) {
    const nameParts = resumeInfo.name?.split(" ") || [];
    return nameParts.slice(1).join(" ") || "";
  }
  if (fieldText.includes("experience") || fieldText.includes("years")) {
    return resumeInfo.experience_years?.toString() || resumeInfo.experience || "";
  }
  if (fieldText.includes("linkedin")) return resumeInfo.linkedin || "";
  if (fieldText.includes("portfolio") || fieldText.includes("website")) return resumeInfo.portfolio || "";

  return null;
}

