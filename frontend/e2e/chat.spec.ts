import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test('sending a chat message does not return 404', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Click FAB to open chat
    const fabButton = page.locator('[data-testid="chat-fab"]');
    await expect(fabButton).toBeVisible({ timeout: 10000 });
    await fabButton.click();
    
    // Wait for chat input to load
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Track network responses for chat API
    const chatApiResponses: number[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/chat')) {
        chatApiResponses.push(response.status());
      }
    });
    
    // Type and send a message
    await chatInput.fill('Hello, test message');
    const sendButton = page.locator('[data-testid="chat-send-button"]');
    await sendButton.click();
    
    // Wait for assistant response to appear (indicates API call succeeded)
    const assistantMessage = page.locator('[data-testid="chat-message-assistant"]').last();
    await expect(assistantMessage).toBeVisible({ timeout: 30000 });
    
    // Verify no 404 responses for chat API
    expect(chatApiResponses).not.toContain(404);
  });

  test('user chat bubble text is visible (light text on dark background)', async ({ page }) => {
    await page.goto('/');
    
    // Click FAB to open chat
    const fabButton = page.locator('[data-testid="chat-fab"]');
    await expect(fabButton).toBeVisible({ timeout: 10000 });
    await fabButton.click();
    
    // Wait for chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Send a test message
    await chatInput.fill('Visibility test message');
    const sendButton = page.locator('[data-testid="chat-send-button"]');
    await sendButton.click();
    
    // Wait for user message bubble to appear
    const userMessage = page.locator('[data-testid="chat-message-user"]').last();
    await expect(userMessage).toBeVisible({ timeout: 10000 });
    
    // Check text color of the message paragraph (should be white/light)
    const messageParagraph = userMessage.locator('p').first();
    const textColor = await messageParagraph.evaluate(el => window.getComputedStyle(el).color);
    
    // White text is rgb(255, 255, 255)
    expect(textColor).toBe('rgb(255, 255, 255)');
    
    // Verify background color is dark (text-primary: #3D2E1F)
    const bubbleContainer = userMessage;
    const bgColor = await bubbleContainer.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(61, 46, 31)'); // #3D2E1F in rgb
  });
});
