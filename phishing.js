export class PhishingDetector {
  constructor() {
    // No need to check for ai.languageModel here
    // We'll handle capability checks when we use the model
  }

  async calculateScore(emailContent) {
    try {
      // Log emailContent for debugging
      console.log('Email content received:', emailContent);

      const features = this.analyzeEmailFeatures(emailContent);

      // Check if the language model is available
      const capabilities = await ai.languageModel.capabilities();

      if (capabilities.available !== "readily") {
        console.warn('Language model is not readily available');

        if (capabilities.consent === "granted") {
          console.log('Consent already granted.');
        } else if (capabilities.consent === "requirable") {
          // Request user consent
          const consentResult = await ai.languageModel.requestConsent();
          if (!consentResult) {
            console.warn('User did not grant consent');
            return 50; // Return a default score or handle accordingly
          } else {
            console.log('User granted consent.');
          }
        } else {
          console.warn('Consent is not available.');
          return 50; // Return a default score or handle accordingly
        }
      }

      // Generate the prompt
      const prompt = `
      Response should be only in English and Arabic numerals EXPLICITLY.
Analyze this email for phishing indicators. Consider:
- Urgency or pressure tactics
- Grammar and spelling errors
- Suspicious links or attachments
- Requests for sensitive information
- Mismatched or fake sender addresses
- Time sent (suspicious if outside business hours)
- Sender legitimacy and domain analysis

Email details:
From: ${emailContent.sender}
Sent: ${emailContent.timestamp}
Subject: ${emailContent.subject}
Body:
${emailContent.body.mainText}

Detected suspicious features:
${features.join('\n')}

Instructions:
- Considering the above information, assign a phishing likelihood score.
- Use English and Arabic numerals.
- Do not include any additional text or explanation.
- Return the result in the format "The score is the following: X", where X is a number between 0 and 100.

      `.trim();

      // Log the generated prompt
      console.log('Generated prompt:', prompt);

      // Create the language model session
      const session = await ai.languageModel.create();

      // Generate the assistant's response
      const response = await session.prompt(prompt);

      // Log the assistant's response
      console.log(`Assistant response from Prompt: ${response}`);

      // After receiving the assistant's response
      const assistantMessage = response.trim();
      console.log(`Assistant response Trimmed: ${assistantMessage}`);

      // Extract the score from the assistant's response
      const scoreMatch = assistantMessage.match(/The score is the following:\s*(\*\*|\*)?(\d+)(\*\*|\*)?/);

      if (scoreMatch) {
        const score = parseInt(scoreMatch[2], 10);
        if (!isNaN(score) && score >= 0 && score <= 100) {
          return score;
        } else {
          console.error(`Invalid score value: ${score}`);
          return 50; // Default score if parsing fails
        }
      } else {
        console.error("Score not found in assistant's response.");
        return 50; // Default score if parsing fails
      }
    } catch (error) {
      console.error(`Error calculating phishing score: ${error}`);
      return 50; // Default score on error
    }
  }

  analyzeEmailFeatures(emailContent) {
    const suspiciousFeatures = [];
    const body = emailContent.body?.mainText || emailContent.body || '';
    const subject = emailContent.subject || '';
    const sender = emailContent.sender || '';

    const bodyLower = body.toLowerCase();

    const urgencyPhrases = [
      'urgent', 'immediate action', 'act now', 'immediate attention',
      'expires soon', 'deadline', 'urgent action required'
    ];
    if (urgencyPhrases.some(phrase => bodyLower.includes(phrase))) {
      suspiciousFeatures.push('Urgency tactics detected');
    }

    const sensitiveTerms = [
      'bank', 'account', 'password', 'verify', 'login',
      'social security', 'credit card', 'validate', 'confirm identity'
    ];
    if (new RegExp(sensitiveTerms.join('|'), 'gi').test(body)) {
      suspiciousFeatures.push('Requests for sensitive information');
    }

    const linkPattern = /http[s]?:\/\/(?![a-z]+\.(google|microsoft|apple|amazon)\.com)[^\s]+/gi;
    const links = body.match(linkPattern);
    if (links) {
      suspiciousFeatures.push(`Suspicious links detected: ${links.length} found`);
    }

    const suspiciousSubjectPhrases = [
      'account suspended', 'verify your account', 'unusual activity',
      'security alert', 'unauthorized access'
    ];
    if (suspiciousSubjectPhrases.some(phrase => subject.toLowerCase().includes(phrase))) {
      suspiciousFeatures.push('Suspicious subject line detected');
    }

    if (sender) {
      const domainMatch = sender.match(/@([^.]+\.[^.]+)$/);
      if (domainMatch) {
        const domain = domainMatch[1].toLowerCase();
        if (!domain.endsWith('.com')) {
          suspiciousFeatures.push('Potential domain spoofing detected');
        }
      }
    }

    if (emailContent.timestamp) {
      const emailDate = new Date(emailContent.timestamp);
      const hour = emailDate.getHours();
      if (hour < 6 || hour > 18) {
        suspiciousFeatures.push('Sent outside typical business hours');
      }
    }

    return suspiciousFeatures;
  }

  getScoreCategory(score) {
    if (score <= 20) return 'Very Low Risk';
    if (score <= 40) return 'Low Risk';
    if (score <= 60) return 'Medium Risk';
    if (score <= 80) return 'High Risk';
    return 'Very High Risk';
  }
}
