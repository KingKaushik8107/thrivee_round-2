import { apiClient } from '../api/thrive-api';
import type { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import type { EmailAnalysisRequest } from '../types';

console.log('[PhishX Extension] Background service worker initialized.');

// In-memory ephemeral active email reference (never permanently persisted)
let activeEmail: EmailAnalysisRequest | null = null;

// Listen for messages from popup UI or content scripts
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse<any>) => void
  ) => {
    // Return true to indicate asynchronous response handler
    handleMessage(message)
      .then((response) => sendResponse(response))
      .catch((err) => {
        sendResponse({
          success: false,
          error: err.message || 'Unknown internal service worker error'
        });
      });

    return true;
  }
);

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse<any>> {
  if (!message || typeof message !== 'object' || !('type' in message)) {
    return {
      success: false,
      error: 'Invalid message structure received by background service worker.'
    };
  }

  switch (message.type) {
    case 'HEALTH_CHECK':
    case 'GET_STATUS': {
      try {
        const health = await apiClient.checkHealth();
        return {
          success: true,
          data: {
            ...health,
            baseUrl: apiClient.getBaseUrl()
          }
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Unable to connect to THRIVE backend.'
        };
      }
    }

    case 'ANALYZE_EMAIL': {
      const payload = message.payload;
      if (!payload || (typeof payload !== 'object')) {
        return {
          success: false,
          error: 'Missing or malformed email analysis payload.'
        };
      }

      // Check if at least one field has data
      const hasContent = Boolean(
        payload.raw_content || payload.body || payload.subject || payload.sender || (payload.urls && payload.urls.length > 0)
      );

      if (!hasContent) {
        return {
          success: false,
          error: 'Analysis payload contains no text, sender, subject, or URLs to investigate.'
        };
      }

      try {
        // Ephemeral in-memory execution: email content is not permanently persisted
        const analysisResult = await apiClient.analyzeEmail(payload);
        return {
          success: true,
          data: analysisResult
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Analysis processing failed in backend.'
        };
      }
    }

    case 'EMAIL_DETECTED': {
      activeEmail = message.payload;
      return {
        success: true,
        data: { stored: true }
      };
    }

    case 'GET_ACTIVE_EMAIL': {
      return {
        success: true,
        data: activeEmail
      };
    }

    case 'PING': {
      return {
        success: true,
        data: { status: 'ready', phase: '8' }
      };
    }

    default: {
      return {
        success: false,
        error: `Unrecognized extension message type: ${(message as any).type}`
      };
    }
  }
}
