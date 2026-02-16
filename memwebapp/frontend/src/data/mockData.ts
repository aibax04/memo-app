
export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  timestamp: string;
  duration: number; // in minutes
  agentId: string;
  agentName: string;
  category: string;
  resolved: boolean;
  satisfactionScore: number; // 1-5
  sentiment: "positive" | "neutral" | "negative";
  messages: Message[];
  tags: string[];
}

export interface Message {
  id: string;
  sender: "customer" | "agent";
  text: string;
  timestamp: string;
}

// Generate random dates within the last 30 days
const getRandomDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
};

// Generate random time duration between 1 and 30 minutes
const getRandomDuration = () => {
  return Math.floor(Math.random() * 30) + 1;
};

// Generate random satisfaction score between 1 and 5
const getRandomSatisfactionScore = () => {
  return Math.floor(Math.random() * 5) + 1;
};

// Generate random sentiment
const getRandomSentiment = (): "positive" | "neutral" | "negative" => {
  const sentiments: ("positive" | "neutral" | "negative")[] = [
    "positive",
    "neutral",
    "negative",
  ];
  return sentiments[Math.floor(Math.random() * sentiments.length)];
};

// Generate random tags
const getRandomTags = () => {
  const allTags = [
    "billing",
    "technical",
    "account",
    "payment",
    "refund",
    "feature",
    "bug",
    "question",
    "complaint",
    "feedback",
    "delivery",
    "login",
    "registration",
    "subscription",
    "UPI",
    "security",
    "privacy",
    "compliance",
    "data",
    "migration",
    "integration",
    "performance",
    "accessibility",
    "mobile",
    "desktop",
    "api",
    "database",
    "storage",
    "network",
    "authentication",
  ];
  
  const numberOfTags = Math.floor(Math.random() * 3) + 1;
  const tags: string[] = [];
  
  for (let i = 0; i < numberOfTags; i++) {
    const randomTag = allTags[Math.floor(Math.random() * allTags.length)];
    if (!tags.includes(randomTag)) {
      tags.push(randomTag);
    }
  }
  
  return tags;
};

// Product-related conversations
const productConversations = [
  {
    category: "product",
    customerQueries: [
      "I'm unable to find the download button for my invoice. Could you please help me locate it?",
      "The app is not showing my recent transactions. I made a payment yesterday but it's not reflecting.",
      "How do I change my delivery address for the current order? I entered the wrong pincode.",
      "Does your app work with Jio network? I'm facing connectivity issues.",
      "I want to add my family members to my premium account. Is there a family plan option?",
      "How do I enable dark mode in the app? I can't find the setting anywhere.",
      "Is there a way to schedule recurring orders for my medications?",
      "Can I get push notifications for new product launches?",
      "How do I track my order status in real-time?",
      "The product image quality is very low on my device. How can I see high-resolution images?",
      "I want to change my default language preference in the app."
    ],
    agentResponses: [
      "I'll be happy to help you find the invoice download option, sir. Please click on 'My Orders' in the menu, then select the order and you'll see a 'Download Invoice' button at the bottom of the order details.",
      "I understand your concern regarding the missing transaction. Sometimes it takes 24-48 hours to reflect. Could you please share your transaction ID or reference number so I can check it for you?",
      "I'd be glad to help you change the delivery address. Unfortunately, once an order is confirmed, the address cannot be modified. However, I can request our delivery team to note the correct pincode. Please share the complete address.",
      "Yes, our app is compatible with all network providers including Jio. The issue might be due to network fluctuations. Please try switching to WiFi or restarting your phone once.",
      "Currently, we don't offer a family plan, but you can add up to 3 devices to your premium account. You'll find this option in 'Account Settings' under 'Linked Devices'.",
      "To enable dark mode, please go to 'Settings' > 'Display' and toggle the 'Dark Mode' option. If you're using the latest app version, you should see this option. If not, please update your app.",
      "Yes, you can schedule recurring orders. Go to 'My Medications', select the item, and click on 'Schedule' to set up delivery frequency. You can choose weekly, monthly, or custom intervals.",
      "Absolutely! To enable push notifications for new products, go to 'Account' > 'Notification Settings' and toggle on 'Product Launches'. You can customize categories of interest there as well.",
      "For real-time tracking, please click on the order in 'My Orders' section. There's a 'Track Live' button which opens our tracking interface with minute-by-minute updates and live map.",
      "For high-resolution images, tap on the product image to enter our 360° view mode. If the issue persists, please check your internet connection as we adapt image quality based on bandwidth.",
      "To change your default language, go to 'Settings' > 'Language & Region' and select your preferred language from the list of 12 supported languages."
    ],
    customerFollowups: [
      "Thanks! I found it now. One more question - can I get a GST invoice?",
      "My reference number is TXN78923. It's been more than 48 hours and I still don't see it.",
      "Thanks for trying. My correct address is 42 Park Street, Mumbai 400001.",
      "I've already tried that. The app keeps saying 'network error' even on WiFi.",
      "That's perfect, thank you! Where exactly in Account Settings? I can't seem to find it.",
      "I updated the app but still don't see the Dark Mode option. I'm using an iPhone 12.",
      "When I try to schedule, it says 'Feature not available in your region'. I'm in Chennai.",
      "I've enabled notifications but I'm not receiving any. My phone settings allow notifications from your app.",
      "The live tracking shows my package is still at the warehouse, but I received an SMS saying it's out for delivery.",
      "I tried what you suggested, but the images are still pixelated. I'm on a high-speed fiber connection.",
      "I selected Hindi but some sections of the app are still showing in English. Is this normal?"
    ],
    agentFollowups: [
      "Yes, you can get a GST invoice. Please go to 'My Orders', select the order, click on 'Download Invoice' and select 'GST Invoice' from the dropdown. You'll need to add your GST details first if you haven't already.",
      "I've checked your transaction with reference TXN78923. The payment was successful but there was a delay in updating our records. I've processed it manually now, and it should reflect in your account within the next hour.",
      "Thank you for providing your correct address. I've forwarded this information to our delivery team. They will attempt delivery to this address. You'll receive an update via SMS when the delivery is out for your location.",
      "I understand that's frustrating. Let's try to clear the app cache. Go to your phone settings, find the app, and clear its cache. If that doesn't work, please try uninstalling and reinstalling the app.",
      "I apologize for the confusion. To add devices, go to 'Account Settings', then 'Security', and you'll find 'Linked Devices' at the bottom of that page. You can add new devices from there.",
      "I apologize for the confusion. On iOS devices, the Dark Mode follows your system settings. Please go to your iPhone's 'Settings' > 'Display & Brightness' and select 'Dark'. Our app will automatically switch to Dark Mode.",
      "I apologize for the inconvenience. The recurring delivery service is currently available only in select metro cities. However, we're expanding to Chennai next month. I've added you to our notification list so you'll be informed when it's available.",
      "I understand that's frustrating. Let's troubleshoot: 1) Please check if you've allowed background app refresh 2) Try toggling the notification permission off and on again 3) If these don't work, could you please tell me which OS version you're using?",
      "I apologize for the discrepancy. There appears to be a delay in our tracking system updates. I've checked with the delivery team and can confirm that your package is indeed out for delivery. You should receive it within 2-3 hours.",
      "I apologize for the persistent issue. It seems there might be a display rendering problem on your device. Please try clearing the app cache, and if that doesn't help, please share your device model and OS version so we can investigate further.",
      "You're right to notice this. Currently, our Hindi translation covers about 85% of the app interface. We're actively working on translating the remaining sections, which should be completed in our next update in two weeks."
    ]
  }
];

// Billing-related conversations
const billingConversations = [
  {
    category: "billing",
    customerQueries: [
      "I've been charged twice for my monthly subscription. Please refund one of the payments urgently.",
      "How do I update my UPI ID for automatic payments? My current bank account is closing.",
      "I didn't receive the cashback that was promised during the Diwali offer. It's been 5 days since my purchase.",
      "The GST details on my invoice are incorrect. I need this fixed for my business tax filing.",
      "I want to switch from monthly to annual payment plan. Will I get any discount?",
      "I was charged a convenience fee even though your website says 'No extra charges'. Why is this happening?",
      "The exchange rate used for my international purchase seems very high. Could you explain how you calculate it?",
      "I'm trying to add my company's corporate credit card but keep getting an error. What's wrong?",
      "My subscription renewed automatically even though I canceled it last week. Please refund immediately.",
      "I need a detailed breakup of all charges on my last invoice, including taxes and processing fees."
    ],
    agentResponses: [
      "I apologize for the inconvenience caused by the double charge. I can see both transactions in our system. The refund will be initiated immediately and should reflect in your account within 5-7 working days.",
      "To update your UPI ID, please go to 'Payment Methods' in your profile, select the existing UPI option and click on 'Edit'. You can enter your new UPI ID there. The changes will be effective from the next billing cycle.",
      "I'm sorry about the cashback issue. According to the Diwali offer terms, the cashback should be credited within 7 working days. Since it's been only 5 days, I request you to wait for 2 more days. If not received by then, please contact us again.",
      "I apologize for the incorrect GST details. Please share your correct GSTIN, registered address, and company name. I'll get the invoice corrected and send it to your registered email within 24 hours.",
      "Excellent choice to switch to the annual plan! Yes, you'll receive a 20% discount compared to the monthly payments. I can help you make this change effective from your next billing cycle.",
      "I apologize for the confusion regarding the convenience fee. The 'No extra charges' applies to standard transactions. However, for premium services or express processing, there is a small convenience fee which is mentioned during the checkout process. Let me check your specific transaction to understand what happened.",
      "I understand your concern about the exchange rate. We use the mid-market rate provided by major financial institutions plus a 2% currency conversion fee which is standard in the industry. The exact rate applied to your transaction depends on the time when the payment was processed. May I know which transaction you're referring to?",
      "I'm sorry you're experiencing issues with adding your corporate card. This could be due to several reasons: 1) The card might have restrictions on online transactions 2) Address verification might be failing 3) Our system might not support your specific corporate card type. Could you please share which card you're trying to add (without sharing the full number)?",
      "I sincerely apologize for this error. I've checked our records and I can see that you did submit a cancellation request on [date]. This shouldn't have happened. I'll process an immediate refund of the full amount and also ensure your subscription is properly canceled now. The refund should reflect in 3-5 business days.",
      "I'd be happy to provide you with a detailed breakdown of your charges. Your invoice should already contain this information, but I'll send you an enhanced version with itemized details of all components including base price, applicable taxes, processing fees, and any discounts applied. Could you please confirm the invoice number you're referring to?"
    ],
    customerFollowups: [
      "Thank you for initiating the refund. Could you share the refund reference number for my records?",
      "I tried that but I'm getting an error saying 'UPI verification failed'. What should I do?",
      "It's been over 10 days now and I still haven't received the cashback. This is unacceptable.",
      "My GSTIN is 29ABCDE1234F1Z5, company name is Tech Solutions Pvt Ltd, and address is 78 Brigade Road, Bangalore 560001.",
      "That sounds great. Can you make the change effective immediately? I don't mind paying the difference upfront.",
      "I was charged ₹50 as convenience fee for a regular transaction. There was no mention of this fee during checkout.",
      "I'm talking about transaction ID TX98765 from last Tuesday. The exchange rate was almost 3% higher than the market rate that day.",
      "I'm trying to add an Amex Corporate Platinum card. The error says 'This card type is not supported'.",
      "Thanks for understanding. Please email me the confirmation once the refund is processed.",
      "The invoice number is INV-20230817-1234. Please send the detailed breakdown as soon as possible."
    ],
    agentFollowups: [
      "I'm happy to provide that information. Your refund reference number is RF298765. You can use this to track the status. If you don't see the refund credited within 7 days, please reach out with this reference number.",
      "I apologize for the error. This sometimes happens due to UPI system maintenance. Please try again after 1 hour, or as an alternative, you can add a credit/debit card for automatic payments which is more reliable.",
      "I sincerely apologize for the delay. I've checked your account and can see that the cashback wasn't processed correctly. I've manually approved it now, and you should receive ₹500 cashback within 24 hours. I'm also adding an additional ₹200 credit as a goodwill gesture for the inconvenience.",
      "Thank you for providing your GST details. I've updated our system with the correct information. The revised invoice will be sent to your registered email within the next 3 hours. Please check your inbox and spam folder.",
      "I appreciate your enthusiasm! Yes, I can make this change effective immediately. The system will calculate the prorated amount for the remaining days of your current month and adjust it against the annual payment. You'll receive an email with the payment details shortly.",
      "I apologize for this unexpected charge. I've checked your transaction and you're absolutely right - there shouldn't have been a convenience fee for this standard transaction. I've initiated a refund of ₹50 which will be credited back to your original payment method within 3-5 business days. I'm also reporting this to our billing team to investigate why this happened.",
      "Thank you for providing the transaction details. After checking transaction TX98765, I can see that you were indeed charged at a higher rate than our standard policy. This appears to be a system error during a peak fluctuation period. I've initiated a refund of the excess amount (₹175) which should be credited back to your account within 5 business days. I apologize for this discrepancy.",
      "I understand your frustration. You're right - currently, we don't support Amex Corporate Platinum cards on our platform due to some technical integration limitations. We're working to add support for this card type in our next payment system update scheduled for next month. In the meantime, would it be possible for you to use an alternative payment method such as a Visa/Mastercard or direct bank transfer?",
      "I've just processed your refund (reference number: RF789012) and sent the confirmation to your registered email address. The cancellation of your subscription is also confirmed, and you will not be charged again. Thank you for your patience during this process, and I apologize again for the inconvenience caused.",
      "I've prepared a comprehensive breakdown of invoice INV-20230817-1234 and just emailed it to your registered address. The breakdown includes base price (₹1,299), GST at 18% (₹233.82), processing fee (₹15), loyalty discount applied (-₹100), and final amount charged (₹1,447.82). If you need any clarification on any of these items, please let me know."
    ]
  },
  {
    category: "billing",
    customerQueries: [
      "I need an itemized receipt for my expense report. Can you provide that?",
      "Your website shows prices in USD but I was charged in INR at a higher rate. Why?",
      "I applied a promo code during checkout but it wasn't reflected in the final price.",
      "Can I get a tax exemption if I purchase using my educational institution account?",
      "My card was declined but I still received a payment confirmation email. Was I charged?",
      "How do I set a spending limit for the sub-accounts I've created for my team?",
      "The recurring billing date keeps changing every month. Can it be fixed to a specific date?",
      "I want to close my account but I have unused credits. Can I get these refunded?",
      "Why do international transactions have an additional fee that's not mentioned upfront?",
      "I purchased the wrong subscription tier. Can I downgrade and get a refund for the difference?"
    ],
    agentResponses: [
      "I'd be happy to provide an itemized receipt for your expense report. Could you please provide the order number or transaction ID? Once I have that, I'll generate a detailed receipt with all the necessary information for your expense reporting.",
      "I apologize for the confusion regarding the currency. Our website displays prices in USD for international visitors by default, but charges are processed in the local currency based on your billing address. The conversion is done at the time of purchase using current exchange rates plus a small conversion fee as mentioned in our terms. Would you like me to check your specific transaction?",
      "I'm sorry to hear that your promo code wasn't applied. Let me check that for you. Could you please share the promo code you used and your order number? I'll verify if the code was valid during your purchase time and why it wasn't applied.",
      "Yes, we do offer tax exemptions for educational institutions. You'll need to register your institution's tax-exempt status with us by providing your tax exemption certificate. Once verified, your account will be flagged for tax exemption on all future purchases. Would you like me to guide you through the registration process?",
      "Let me check this for you right away. It's unusual to receive a confirmation without a successful charge. Could you please provide your order number and the last four digits of your card? I'll verify whether the transaction went through or if this was an error in our notification system.",
      "You can set spending limits for sub-accounts through the Admin Dashboard. Go to 'Account Management' > 'Team Members' > select the sub-account > 'Set Limits'. You can establish monthly or per-transaction limits and even restrict certain categories of purchases. Would you like me to walk you through these settings?",
      "Yes, we can definitely fix your billing date to be consistent. By default, the system bills on the anniversary of your signup date, but we can adjust this to a specific date of your choosing. What date would you prefer for your monthly billing cycle?",
      "Yes, we can process a refund for your unused credits upon account closure. Our standard policy is to refund any remaining balance to your original payment method. Once you initiate the account closure process, you'll be given the option to request this refund. Would you like to proceed with closing your account now?",
      "I apologize for any lack of transparency regarding international transaction fees. These fees (typically 1.5%) are mentioned in our Terms of Service, but I understand they should be more clearly displayed during checkout. I'll share this feedback with our team. For your specific transaction, I can check if the fee was appropriate or if an adjustment is needed.",
      "Yes, you can downgrade your subscription and we'll provide a prorated refund for the unused portion of the higher tier. This can be done through your account settings under 'Subscription Management'. Would you like me to process this change for you now, or would you prefer to do it yourself?"
    ],
    customerFollowups: [
      "My order number is ORD-876543. Please include all taxes and fees separately in the receipt.",
      "Yes, please check transaction #TX-45678. The difference is significant - almost 5% more than the expected conversion rate.",
      "I used WELCOME20 and my order number is ORD-765432. The code was supposed to give me 20% off.",
      "Yes, please guide me. I'm from Stanford University and have our tax exemption certificate ready.",
      "My order number is ORD-654321 and the last four digits of my card are 4567. Please check if I was charged.",
      "Yes, please. I specifically need to set a monthly limit of $500 for our marketing team sub-accounts.",
      "I would like my billing date to be the 1st of each month for easier accounting.",
      "Yes, I want to close my account. I have about $120 in unused credits that I'd like refunded.",
      "Please check transaction ID INT-543210. The fee was almost $25 on a $300 purchase which seems excessive.",
      "I'd like to downgrade from Enterprise to Professional plan. My account number is ACC-123456."
    ],
    agentFollowups: [
      "I've generated and emailed you an itemized receipt for order ORD-876543. The receipt includes a breakdown of the base price ($199), platform fee ($10), GST at 18% ($37.62), and the total amount charged ($246.62). The email also includes a PDF attachment that's suitable for expense reporting purposes. Is there anything else you need in the receipt format?",
      "I've checked transaction #TX-45678 and you're absolutely right. Our standard conversion markup is 2%, but in your case, it appears that a 5.2% markup was erroneously applied. This was due to a system error during the currency conversion process. I've initiated a refund of the excess charge amount ($15.63) which will be credited back to your card within 5-7 business days. I sincerely apologize for this error.",
      "I've checked your order ORD-765432 and you're right - the WELCOME20 code should have applied a 20% discount. The issue occurred because the promo code had a minimum purchase requirement of $100, and your cart total was $98.50 before applying the code. However, since this requirement wasn't clearly communicated during checkout, I've manually applied the discount. You'll receive a refund of $19.70 (20% of your purchase) within 3-5 business days. I apologize for the confusion.",
      "Thank you for providing that information. To register Stanford University for tax exemption, please email your tax exemption certificate to tax-exemptions@ourcompany.com with subject line 'Tax Exemption - Stanford University'. Alternatively, you can upload it directly through your account dashboard under 'Tax Settings'. Once verified (usually within 48 hours), all future purchases will be exempt from applicable taxes. If you have any urgent purchases to make, please let me know and I can flag your account for expedited review.",
      "Thank you for providing those details. After checking order ORD-654321, I can confirm that your card was not charged. The confirmation email was sent erroneously due to a system glitch. The transaction was declined by your bank with reason code 'Insufficient funds'. No payment was processed and no charge was applied to your account. You're welcome to try the purchase again with an alternative payment method if you'd like.",
      "I've set up a monthly spending limit of $500 for your marketing team sub-accounts. To verify: From now on, once a sub-account reaches this limit, any further purchase attempts will be declined until the next billing cycle. You'll receive notifications when accounts reach 80% and 100% of their limit. You can adjust these limits anytime from your Admin Dashboard. Is there anything else you'd like to customize about these account restrictions?",
      "I've updated your billing cycle to occur on the 1st of each month as requested. This change will take effect from next month. You'll be charged a prorated amount for the period between your current billing date and June 1st, and then regular full monthly charges will occur on the 1st of each month going forward. I've sent an email confirmation of this change to your registered email address.",
      "I understand you want to close your account with a refund of unused credits. I've initiated the account closure process and requested a refund of your $120 credit balance to your original payment method. You should receive these funds within 7-10 business days. You'll have access to your account for the next 30 days to download any data or reports you might need. After that, your account and data will be permanently deleted. I've sent a confirmation email with all these details.",
      "I've reviewed transaction ID INT-543210 and you're right to question this fee. Our standard international transaction fee is 1.5%, which should have been $4.50 on your $300 purchase. The $25 fee was incorrectly applied due to a system error that categorized this as a specialized service transaction. I've initiated a refund of $20.50 (the excess fee amount) which will be credited back to your account within 5-7 business days. I apologize for this error and thank you for bringing it to our attention.",
      "I've processed your subscription downgrade from Enterprise to Professional plan for account ACC-123456. The change is effective immediately. Based on your billing cycle, you'll receive a prorated refund of $350 for the unused portion of your Enterprise subscription. This refund will be processed to your original payment method within 5-7 business days. Your next billing will be at the Professional plan rate. Please note that some Enterprise features will no longer be available. I've sent you an email with details of which features will be affected by this downgrade."
    ]
  }
];

// Technical-related conversations
const technicalConversations = [
  {
    category: "technical",
    customerQueries: [
      "The app keeps crashing when I try to upload my documents for KYC verification.",
      "I'm getting an error message saying 'Server not responding' when trying to make a payment through net banking.",
      "The OTP is not reaching my mobile number for confirming my purchase.",
      "How do I reset my password? I've forgotten it and need urgent access to my account.",
      "My data is showing differently on the app and website. Which one is correct?",
      "I'm unable to export my reports as CSV files. The download button is not working.",
      "The dashboard widgets are not updating in real-time as they used to.",
      "The search functionality isn't returning relevant results anymore.",
      "Your app is consuming too much battery on my phone. Is this normal?",
      "I keep getting logged out every few minutes. Why is this happening?",
      "The biometric login option suddenly disappeared from my app."
    ],
    agentResponses: [
      "I understand the frustration with the app crashes. The KYC document upload requires a stable internet connection. Also, please ensure your documents are less than 5MB in size and in JPG or PDF format. If the issue persists, could you please try using our website instead?",
      "I apologize for the inconvenience with the payment gateway. The 'Server not responding' error usually occurs due to bank server maintenance. Please try using UPI or card payment as an alternative. Or you could try again after 30 minutes when the bank servers might be back to normal.",
      "I apologize that you're not receiving the OTP. Let me verify your registered mobile number. Also, please check if you have any SMS blocking apps or DND services activated that might be blocking our messages. As an alternative, we can send the OTP to your email address.",
      "No worries about the forgotten password. Please click on the 'Forgot Password' link on the login page. We'll send a password reset link to your registered email ID. If you don't have access to that email, please provide an alternative verification method like your registered mobile number.",
      "I apologize for the inconsistency between app and website data. The app data might be cached. Please pull down on the screen to refresh or log out and log back in. The website typically shows the most up-to-date information since it fetches data directly from our servers.",
      "I'm sorry you're having trouble with the CSV export. This could be due to a few reasons: 1) The data volume might be too large - try reducing your report parameters 2) Your browser might be blocking downloads - check your permissions 3) There could be temporary server issues. Could you tell me which report you're trying to export and what happens when you click the download button?",
      "I apologize for the real-time update issue. We recently implemented some changes to reduce server load by setting a 30-second refresh interval. If you need more frequent updates, you can manually refresh by pulling down on the dashboard. Would you prefer we revert to the previous real-time updates for your account?",
      "I'm sorry to hear about the search issues. We recently updated our search algorithm to improve results. Could you share what specific terms you're searching for and what results you expected? This will help us troubleshoot the problem and potentially refine the algorithm for your specific use case.",
      "Increased battery consumption isn't normal and suggests an issue with background processes. Our latest app update (v5.2.1) includes battery optimization fixes. Could you please check if your app is updated to the latest version? Also, in your phone settings, check if background app refresh is enabled for our app and consider disabling it if battery life is a priority.",
      "Frequent logouts are usually related to security settings or session management issues. This could happen if: 1) You're accessing from multiple devices simultaneously 2) Your network IP is changing frequently 3) We have a 15-minute inactivity timeout by default. Would you like me to extend your session timeout or investigate if there's another issue causing this?",
      "I understand the inconvenience of losing the biometric login feature. This typically happens when: 1) The device's biometric settings were changed 2) The app was updated recently 3) Your OS had a security update that affected permissions. To restore this: Go to App Settings > Security > Enable Biometric Authentication. If you don't see this option, please let me know your device model and OS version."
    ],
    customerFollowups: [
      "I've tried all that. I'm using a stable WiFi connection, and my documents are JPG files under 2MB. It still crashes every time.",
      "I've tried all payment options, including UPI and cards. All of them show the same error. Is your system down?",
      "I've checked everything. No DND service is active. Can you send the OTP to my email please? My email is user@example.com.",
      "I don't have access to my registered email anymore as it was my old company email. My registered mobile number is +91 98765 43210.",
      "I've tried logging out and back in several times. The data is still different. It shows I have 5000 points on the website but only 3000 on the app.",
      "I'm trying to export the Q1 Sales Report. When I click download, I briefly see 'Preparing download' and then nothing happens. No errors, just nothing.",
      "Yes, please revert to real-time updates for my account. I'm making trading decisions based on this data and need immediate updates.",
      "I searched for 'cloud storage options' but got results about storage containers and physical warehousing instead of cloud storage services.",
      "Yes, I'm on the latest version 5.2.1. Background refresh is disabled but the app still drains about 20% of my battery daily, which is much higher than before.",
      "I'm only using one device and have a stable network connection. The logouts happen even when I'm actively using the app. It's very disruptive during meetings.",
      "I've checked these settings but don't see any biometric option. I'm using a Samsung Galaxy S21 with Android 12."
    ],
    agentFollowups: [
      "I'm sorry you're still experiencing issues. Let's try a different approach. Can you please share what device and OS version you're using? In the meantime, I'm creating a special upload link that should work regardless of the app issues. I'll email this secure link to your registered email address in the next 5 minutes.",
      "I apologize for the persistent issues. Upon checking our system status, I can see that we're currently experiencing some technical difficulties with our payment gateway. Our technical team is working on it. The estimated resolution time is 2 hours. Would you like me to notify you once the system is back up?",
      "I've sent the OTP to your email user@example.com. Please check your inbox and spam folder. The OTP will be valid for 15 minutes. If you don't receive it within 5 minutes, please let me know and I'll resend it.",
      "Thank you for providing your mobile number. I've initiated a password reset via SMS. You should receive a text message with a reset link shortly. If you don't receive it within 5 minutes, I can also help you verify your identity through alternative methods.",
      "Thank you for bringing this to our attention. After checking our database, I can confirm that the website is showing the correct balance of 5000 points. There appears to be a synchronization issue with the app. I've triggered a manual sync for your account. Please force close the app, wait 5 minutes, then reopen it to see the updated balance.",
      "Thank you for the details. The Q1 Sales Report is quite large (over 50MB when exported to CSV), which might be causing the download timeout. I've created a special export job for you that will process in the background and then email the file to you directly. You should receive this within the next 15-20 minutes. For future large reports, I recommend using the 'Schedule Report' feature which handles these large exports more efficiently.",
      "I understand the importance of real-time data for trading decisions. I've changed your account settings to receive real-time updates without the 30-second delay. This change is effective immediately. Please refresh your dashboard once to activate the real-time feed. Please note that this might slightly increase data usage if you're on a mobile connection.",
      "Thank you for that specific example. There appears to be a miscategorization in our search algorithm for cloud-related terms. I've reported this specific issue to our development team with priority. In the meantime, try searching for 'digital storage solutions' or 'online backup' which should yield more relevant results. Also, you can navigate directly to the cloud storage section through Menu > Services > Cloud Solutions.",
      "That level of battery drain is definitely abnormal, even for the latest version. Based on your description, it appears that the app might be running some processes in the background despite the setting being disabled. I'm creating a diagnostic ticket for our technical team to investigate this specific issue. In the meantime, you can try forcibly restricting the app's background activity through your phone's battery optimization settings (Settings > Battery > App Power Management). We'll email you when we have a fix for this issue.",
      "This definitely shouldn't be happening during active use. I've checked your account logs and can see the unusual disconnections. This appears to be a session management bug affecting certain user accounts including yours. I've escalated this to our development team as a high-priority issue. As an immediate workaround, I'm switching your account to use our legacy authentication system which should prevent the random logouts. Please log out once manually and log back in for this change to take effect.",
      "Thank you for providing your device details. There's a known compatibility issue with biometric authentication on Samsung devices running Android 12 due to their recent security update. Our development team is working on a fix that will be included in version 5.2.2, scheduled for release next week. In the meantime, you can use PIN or pattern authentication. I've added your email to the priority notification list so you'll be informed as soon as the update is available that resolves this issue."
    ]
  },
  {
    category: "technical",
    customerQueries: [
      "The video conferencing feature keeps freezing during my team meetings.",
      "I can't sync my calendar with your scheduling system. It gives a 'Permission Denied' error.",
      "The mobile app notifications don't match what I've set in my preferences.",
      "Is there a way to integrate your API with our internal tools? We need automation.",
      "The charts in my analytics dashboard are showing 'No Data' even though I can see data in the tables.",
      "I keep getting '502 Bad Gateway' errors when uploading large files to your platform.",
      "The dark mode in your app doesn't apply to all screens. Some are still blindingly white.",
      "My custom report templates disappeared after your recent update. Can I recover them?",
      "The multi-factor authentication setup isn't working with my authenticator app.",
      "Your desktop application crashes whenever I connect my external monitor."
    ],
    agentResponses: [
      "I understand how frustrating video freezing can be during important meetings. Several factors could cause this: 1) Insufficient bandwidth - our system requires at least 5Mbps for HD video 2) Processing load - closing other applications might help 3) Outdated browser or app version. Could you tell me which browser or app version you're using for the calls? Also, does this happen with all participants or only certain ones?",
      "I apologize for the calendar sync issues. The 'Permission Denied' error typically occurs when the authorization between our system and your calendar provider has expired or been revoked. To resolve this, please visit Settings > Integrations > Calendar, then disconnect and reconnect your calendar service. Which calendar service are you using (Google, Outlook, etc.)?",
      "I'm sorry about the notification discrepancy. Our notification system was updated recently which might have reset some preferences. Could you tell me which specific notifications you're receiving that don't match your settings? Also, please check if your mobile OS notification settings are overriding our app settings.",
      "Yes, we do offer API integration capabilities for automation! We have a comprehensive REST API with webhooks for real-time events. You can find our developer documentation at api.ourcompany.com. We also have pre-built connectors for popular platforms like Zapier, Microsoft Flow, and custom webhook support. What specific internal tools are you looking to integrate with?",
      "I'm sorry about the empty charts issue. This typically happens when: 1) The date range selected has no data 2) Filters applied are excluding all data points 3) There's a rendering issue with your browser. Could you tell me which specific charts are affected and what date range you're viewing? Also, have you tried using a different browser to see if the issue persists?",
      "The '502 Bad Gateway' error during large file uploads is typically caused by timeout issues when the server takes too long to process the upload. Our standard timeout is 60 seconds. For large files, I recommend: 1) Using our chunked upload feature via the desktop app 2) Compressing files before uploading 3) Breaking up very large files. How large are the files you're trying to upload?",
      "You're right about the dark mode inconsistency, and we apologize for the oversight. Our development team is aware of this issue and is working on applying dark mode to all screens. The current version has about 85% coverage. The next update (scheduled for release in two weeks) should address most remaining light screens. In the meantime, which specific screens are still showing in light mode?",
      "I apologize about your missing custom report templates. During our recent update, templates stored locally might not have migrated correctly. However, if you had previously saved these templates to your account (rather than just locally), we should be able to recover them. When did you last see your templates, and approximately how many were there?",
      "I'm sorry you're having trouble with MFA setup. To troubleshoot: 1) Make sure your authenticator app and phone have the correct time/timezone settings 2) Try regenerating the QR code 3) Consider using an alternative authenticator app. Which authenticator app are you trying to use? And at which step exactly does the setup fail?",
      "I apologize for the desktop application crashes. This could be related to display driver issues or resolution changes when connecting external monitors. Could you tell me your operating system version, which graphics card you're using, and whether the crash happens immediately upon connecting the monitor or only when performing certain actions afterward?"
    ],
    customerFollowups: [
      "I'm using Chrome version 90 and your desktop app version 4.5.2. It happens with all participants, and I have a 100 Mbps fiber connection.",
      "I'm using Google Calendar. I've already tried disconnecting and reconnecting, but I still get the same error.",
      "I've set all notifications to 'off' except for direct messages, but I'm still getting notifications for group chats and announcements.",
      "We want to integrate with our custom-built CRM and our project management tool built on Jira.",
      "The revenue and user acquisition charts show no data for any date range, but the data tables below show plenty of entries. I've tried Firefox and Chrome.",
      "I'm trying to upload design files around 1.5GB in size. Is there a file size limit I should be aware of?",
      "The settings page, export dialog, and notification center are still in light mode even when the rest of the app is dark.",
      "I had about 15 custom templates that I was using yesterday. After updating to version 6.2 this morning, they all disappeared.",
      "I'm using Google Authenticator. The setup fails when I enter the 6-digit code. It always says 'Invalid code'.",
      "I'm on Windows 11 with an NVIDIA GeForce RTX 3070. The app crashes immediately when the monitor is connected, before I can do anything."
    ],
    agentFollowups: [
      "Thank you for providing those details. Both your Chrome and our desktop app versions are outdated, which could be causing the compatibility issues. The latest Chrome version is 96 and our app version is 5.1.0. I recommend updating both. Additionally, I've checked our logs and found that your account is being routed through a congested server node. I've switched you to a different server cluster which should provide a smoother experience. Please try updating and let me know if the issue persists after these changes.",
      "I appreciate you trying the standard troubleshooting steps already. This suggests a deeper issue with the Google Calendar API permissions. I've checked our system and there's currently a known issue affecting Google Calendar synchronization due to recent changes in Google's API requirements. Our team is working on an urgent fix. As a temporary workaround, you can use the iCal feed method instead: go to Settings > Integrations > Calendar > Advanced > Import iCal URL from Google. Would you like me to guide you through these steps?",
      "Thank you for clarifying the issue. This is definitely not the expected behavior. I've checked your notification settings and found a discrepancy between your app settings and our server configuration. There appears to be a sync issue that's preventing your updated preferences from being properly saved to our servers. I've manually updated your notification settings on the server side to match your preferences. Please force-close the app and reopen it for these changes to take effect. The notifications should now work as expected.",
      "Great! For Jira integration, we have a pre-built connector available in the Atlassian Marketplace that synchronizes issues, comments, and status updates in real-time. For your custom CRM, you can use our REST API with webhook support. I'm sending you our developer documentation for both options, along with authentication examples and sample code snippets for common use cases. Would you also like me to connect you with our integration specialist who can provide more specific guidance based on your exact requirements?",
      "Thank you for trying different browsers. This suggests a data access issue rather than a rendering problem. After checking your account permissions, I found that you're missing the 'Analytics Viewer' role that was added in our last update. I've added this role to your account, which should restore access to all chart data. Please refresh the dashboard and let me know if you can see the charts now. If not, our data team can perform a deeper investigation.",
      "Yes, our platform has a file size limit of 1GB per individual file for web uploads. For files larger than 1GB, I recommend either: 1) Using our desktop sync client which supports files up to 10GB 2) Splitting large files into smaller parts 3) Using our enterprise API for large file transfers. Since you're working with 1.5GB design files, the desktop sync client would be your best option. Would you like me to provide instructions for setting this up?",
      "Thank you for identifying those specific areas. You're right - those sections were overlooked in our dark mode implementation. I've created a direct ticket with our UI team about these specific screens (ticket ID: DM-2367). The good news is that I can offer you early access to our beta version which has already addressed these issues. Would you be interested in joining the beta program to get access to the fully implemented dark mode now, rather than waiting for the public release in two weeks?",
      "I apologize for the loss of your templates after the update. Based on the timing, I believe we can recover them through our backup system. We maintain backups of all user templates for 30 days specifically for situations like this. I've initiated a template recovery process from our backup system for your account. This typically takes 2-3 hours to complete. You'll receive an email notification once your templates are restored. In the meantime, is there a specific critical template you need access to urgently that I could help recreate?",
      "Thank you for the details. The 'Invalid code' error with Google Authenticator is typically caused by time synchronization issues. Since Google Authenticator doesn't automatically sync time, there might be a drift between your phone's clock and our servers. Please try this: In Google Authenticator, go to Settings > Time correction for codes > Sync now. After syncing, try entering the code again. If this doesn't resolve the issue, we can set up SMS-based 2FA as an alternative. Would you like to try that instead?",
      "Thank you for the system details. This is a known issue with our application and NVIDIA RTX series cards on Windows 11. The problem occurs due to a conflict with the latest NVIDIA drivers and our OpenGL implementation when resolution or refresh rate changes are detected. Our development team has a fix ready in version 5.2.0 which is scheduled for release next week. As an immediate workaround, you can try: 1) Connect the monitor before starting the application 2) Temporarily roll back to the previous NVIDIA driver version 466.47 which doesn't trigger this issue. Would either of these workarounds be feasible for you in the short term?"
    ]
  }
];

// Account-related conversations
const accountConversations = [
  {
    category: "account",
    customerQueries: [
      "I need to change the mobile number linked to my account as I've got a new SIM card.",
      "How do I delete my account? I no longer wish to use your services.",
      "Can I have two accounts with the same email ID? I need one for personal use and one for business.",
      "I can't login to my account even though I'm entering the correct password.",
      "I want to change my username as it contains my full name which I don't want to display.",
      "Is there a way to merge my two accounts? I accidentally created a duplicate.",
      "How can I download all my data from your platform before closing my account?",
      "I want to add another admin to my business account. Where is this option?",
      "I keep getting security alerts about login attempts from other countries, but it's just me traveling.",
      "What happens to my subscribed content if I temporarily deactivate my account?"
    ],
    agentResponses: [
      "I'd be happy to help you update your mobile number. For security verification, we'll send an OTP to your currently registered number. Once verified, you can add your new number. If you don't have access to the old number, we can verify through your email ID instead.",
      "I'm sorry to hear you wish to delete your account. Please note that this action is permanent and all your data, including purchase history and saved preferences, will be lost. To proceed, please go to 'Account Settings' > 'Privacy' > 'Delete Account'. You'll need to enter your password to confirm.",
      "Unfortunately, our system doesn't allow two accounts with the same email ID. However, you can create a business account using a different email, and then link both accounts through our 'Connected Accounts' feature. This will let you switch between them easily.",
      "I'm sorry you're having trouble logging in. Let's check a few things: (1) Caps lock is off, (2) No extra spaces in your email or password, (3) You're using the registered email. If you're still unable to login, I can send a password reset link to your registered email.",
      "You can easily change your username. Go to 'Profile Settings' and click on 'Edit' next to your current username. Please note that usernames must be unique, so your preferred choice might not be available if already taken by another user.",
      "Yes, we do offer account merging. This process combines your subscription history, saved content, and preferences from both accounts. To ensure data security, we'll need to verify ownership of both accounts through email verification. Would you like me to initiate this process for you? If so, please provide both account email addresses.",
      "We respect your data ownership and privacy. To download all your data, go to Account Settings > Privacy > Request Data Export. You'll receive a link to download a complete archive of your data within 48 hours. This includes your posts, comments, media uploads, and account history. Is there specific data you're most concerned about preserving?",
      "Adding another admin to your business account is available on all Business and Enterprise plans. Go to Admin Dashboard > User Management > Add Admin. You'll need to enter their email address and select their admin privileges (full or limited). They'll receive an invitation email to join as an admin. Would you like me to walk you through the specific permission options?",
      "I understand how annoying these security alerts can be while traveling. You have two options: 1) Temporarily disable login notifications from Account > Security > Notifications, or 2) Enable 'Travel Mode' which suspends unusual location alerts for up to 30 days. Would you like me to enable Travel Mode for your account now?",
      "When you temporarily deactivate your account, your subscriptions remain intact, and no content is lost. Your profile becomes invisible to other users, and you won't receive notifications. Once you reactivate, everything returns exactly as you left it. If your subscription renewal date occurs while deactivated, it will still process normally. How long are you planning to deactivate your account?"
    ],
    customerFollowups: [
      "I don't have access to my old number anymore. Can you verify through my email? It's user@example.com.",
      "I don't see the Delete Account option under Privacy. Can you guide me step by step?",
      "How do I set up this Connected Accounts feature? I don't see it in my settings.",
      "I've checked all those things. I'm certain my password is correct. Please send a reset link to user@example.com.",
      "I tried that but it says my chosen username 'jdoe2023' is already taken. Can you suggest alternatives?",
      "Yes, please. My accounts are registered under user1@example.com and user2@example.com. I want to keep the first one.",
      "Yes, I'm particularly concerned about my uploaded documents and project files. Will those be included?",
      "Yes please. I specifically want to limit what financial data the new admin can access.",
      "Yes, please enable Travel Mode. I'll be traveling internationally for the next 3 weeks.",
      "I'm planning to deactivate for about 2 months while I'm on a digital detox retreat."
    ],
    agentFollowups: [
      "I'd be happy to help with email verification instead. I've just sent a verification code to user@example.com. Once you provide that code, I'll be able to update your mobile number in our system. The email should arrive within the next 5 minutes. Please check your inbox and spam folder.",
      "I apologize for the confusion. The option may have moved in our recent app update. Please go to 'Account Settings', then 'Data & Privacy', scroll to the bottom and you'll find 'Account Management'. Under this section, you'll see the 'Delete Account' option. If you still don't see it, please let me know which version of the app you're using.",
      "The Connected Accounts feature can be accessed through our website only, not the mobile app. Please login to your account on our website, go to 'Account Settings', then 'Connections', and click on 'Link a New Account'. You'll be guided through the process of creating and connecting your business account.",
      "I've sent a password reset link to user@example.com. It should arrive within the next few minutes. The link will be valid for 24 hours. Once you reset your password, please try logging in again. If you continue to have issues, please let me know.",
      "I understand the frustration with finding an available username. Based on your preference for 'jdoe2023', here are some alternatives that are currently available: 'johndoe2023', 'j.doe2023', 'jdoe_2023'. Would any of these work for you? Or would you prefer a completely different username?",
      "Thank you for providing both email addresses. I've initiated the account merging process. Both accounts will receive a verification email with a unique code. Once you confirm both codes, we'll begin merging user2@example.com into user1@example.com. This process typically takes 24-48 hours to complete. During this time, you'll still have access to both accounts. After merging, only the user1@example.com account will remain active with all combined data. Would you like me to send you an email confirmation when the merge is complete?",
      "Yes, all your uploaded documents and project files will definitely be included in the data export. The download will come as a compressed ZIP file with folders organized by content type. Your documents and project files will be in their original format in the 'Uploads' and 'Projects' folders respectively. The export also includes a metadata file that maps each document to its upload date and associated projects. Is there anything else you'd like included in your data export?",
      "I understand your concern about financial data access. When adding the new admin, you'll see granular permission controls on the second page. For limiting financial access: 1) Uncheck 'Billing & Payments' 2) Set 'Financial Reports' to 'View Only - No Export' 3) Under 'Invoice Management', select 'No Access'. This way, the new admin can manage users and content but won't see sensitive financial details or make payments. Would you like any other permission restrictions for this admin?",
      "I've enabled Travel Mode on your account effective immediately for 3 weeks. This means you won't receive security alerts for logins from new locations during this period. The system will automatically disable Travel Mode on June 5th. I've sent a confirmation email with these details to your registered address. You can manually disable Travel Mode earlier through your security settings if you return sooner. Is there anything else you need before your travels?",
      "I've noted your 2-month deactivation plan. Your account is set to reactivate automatically after 60 days, but you can manually reactivate sooner if needed. During this period, your subscription will remain active, and all content will be preserved. I recommend downloading any critical content you might need access to during your detox, as you won't be able to access the platform while deactivated. Would you like me to schedule your deactivation to begin immediately or at a specific date?"
    ]
  },
  {
    category: "account",
    customerQueries: [
      "I need to update my company's billing address for tax purposes.",
      "How can I see who has access to our team workspace?",
      "What security measures do you have in place to protect my account?",
      "I'd like to enable Single Sign-On with our company's Microsoft account.",
      "Is it possible to have different notification settings for different projects?",
      "Can I transfer my premium subscription to a colleague when I leave the company?",
      "How do I enable two-factor authentication for all users in my organization?",
      "I want to restrict access to our company data from certain countries for security reasons.",
      "How do I change the primary contact person for our corporate account?",
      "We need to set up custom roles with specific permissions for our team structure."
    ],
    agentResponses: [
      "I'd be happy to help you update your company's billing address. You can do this in the Billing section of your account settings. Go to 'Account' > 'Billing & Payments' > 'Billing Information'. After updating, all future invoices will reflect the new address. If you need historical invoices updated with the new address, we can arrange that as well. Would you like to proceed with updating your billing address now?",
      "To see who has access to your team workspace, navigate to 'Admin Dashboard' > 'User Management'. This will show a complete list of all members with their access levels and last login dates. You can filter by department, role, or access level. As an admin, you can also audit user permissions and remove access if needed. Would you like me to guide you through auditing specific user permissions?",
      "We take security very seriously and employ multiple measures to protect your account. These include: 1) 256-bit encryption for all data 2) Two-factor authentication options 3) Regular security audits and penetration testing 4) Suspicious activity monitoring 5) IP-based login controls 6) Session timeout settings. For enterprise accounts, we also offer custom security policies. Would you like to enable any additional security features for your account?",
      "Yes, you can enable SSO with Microsoft. This is available on our Enterprise and Business Pro plans. To set this up: 1) Go to 'Admin Settings' > 'Authentication' > 'SSO Configuration' 2) Select Microsoft as your IdP 3) Enter your Azure AD tenant ID 4) Configure the redirect URLs in both our system and your Microsoft Azure portal. Would you like a step-by-step guide with screenshots for this setup process?",
      "Yes, you can customize notification settings per project. Go to the specific project, click on 'Project Settings' > 'Notifications'. Here you can set different notification preferences for each project independently of your global settings. You can also create notification rules based on project roles, activity types, or priority levels. Would you like me to explain the specific notification options available?",
      "Yes, subscription transfers are possible for corporate accounts. As an admin, go to 'Subscription Management' > 'Licenses' > select the user's license > 'Transfer'. You'll be asked for the email of the new user. The transfer preserves all settings and access levels but removes personal data from the original user. Would you like me to process this transfer for you, or would you prefer to do it through your admin dashboard?",
      "To enable two-factor authentication for all users: 1) Go to 'Admin Dashboard' > 'Security Settings' > 'Authentication' 2) Enable 'Require 2FA for all users' 3) Set a compliance deadline (users will be prompted to set up 2FA by this date). You can also specify which 2FA methods are allowed (authenticator app, SMS, email, security keys). Would you like me to enable this requirement for your organization now?",
      "Yes, geographic access restrictions are available on our Enterprise Security plan. In the Admin Console, go to 'Security' > 'Geographic Controls'. Here you can either whitelist allowed countries or blacklist specific countries. When a login is attempted from a restricted location, it will be blocked and the security admin will be notified. Would you like me to help you set up these restrictions for specific countries?",
      "Changing the primary contact for your corporate account requires verification from the current primary contact. Please have your current primary contact (listed as [Current Contact Name]) send an authorization email to support@ourcompany.com from their registered email address. Alternatively, you can update this in 'Organization Settings' > 'Account Contacts' if you have admin privileges. Would you like me to initiate this change request process for you?",
      "Yes, custom roles are available on our Enterprise plan. To set these up, go to 'Admin Controls' > 'Roles & Permissions' > 'Create Custom Role'. You can build roles from scratch or modify existing templates. Each role can have granular permissions across different features. We recommend starting with a template closest to your needs and then modifying specific permissions. Would you like guidance on setting up particular custom roles for your team structure?"
    ],
    customerFollowups: [
      "Yes, I'd like to update it now. Our new address is 123 Business Park, Suite 456, Chicago, IL 60601, USA.",
      "Yes please. I specifically want to check who has admin-level access to our financial documents.",
      "Yes, I'd like to enable two-factor authentication and IP restrictions for our account.",
      "Yes, a step-by-step guide would be very helpful. Our tenant ID is abc123def456.",
      "Yes, please explain. I specifically need different notification settings for confidential projects versus public ones.",
      "I'd like to transfer the premium subscription from jane@company.com to robert@company.com effective next Monday.",
      "Yes, please enable it now. I want to require authenticator app only, not SMS, and give users 14 days to comply.",
      "Yes, I need to restrict access from Russia, China, and North Korea for compliance reasons.",
      "Yes, please initiate the process. The new contact should be Sarah Johnson (sarah.johnson@company.com) instead of Michael Brown.",
      "Yes, we need a 'Content Reviewer' role that can approve content but not create or delete it."
    ],
    agentFollowups: [
      "I've updated your company's billing address to: 123 Business Park, Suite 456, Chicago, IL 60601, USA. This change will be reflected on all future invoices starting from your next billing cycle. I've also added a note to your account regarding this change. If you need any previous invoices reissued with the new address for tax purposes, please let me know which specific invoice dates you need updated, and we can process those for you within 2-3 business days.",
      "I've checked your team's permissions regarding financial documents. Currently, there are 5 users with admin-level access to financial documents: [User1], [User2], [User3], [User4], and [User5]. Additionally, I notice that there are 3 former employees who still have view access to these documents. Would you like me to revoke access for these former employees? I can also downgrade specific current users from admin to viewer access if you'd prefer to limit who can modify financial documents.",
      "I've enabled two-factor authentication for your account. You'll be prompted to set it up the next time you login. For IP restrictions, I need to know which IP addresses should be allowed. Would you like to restrict access to only your office IP addresses, or would you prefer to just block specific suspicious IPs? Also, would you like to receive email alerts when login attempts are made from unrecognized IPs?",
      "I've prepared a step-by-step SSO guide for Microsoft integration with your tenant ID abc123def456. The guide includes screenshots and configuration values specific to your account. I've just emailed this document to your registered email address. Once you've configured your Azure AD settings according to the guide, please let me know and I'll activate SSO on our end. After that, your team members will be able to use their Microsoft credentials to access our platform. Would you like me to schedule a call with our technical team to assist with this setup?",
      "For project notifications, you can create two different profiles: 1) For confidential projects: Go to the project > Settings > Notifications > 'Create Custom Profile' > select 'Restricted' template. This limits notifications to direct mentions and critical updates only, with no content previews in emails or push notifications. 2) For public projects: Use the 'Comprehensive' template which includes activity summaries and content previews. You can further customize either template by toggling specific notification types. Would you like me to create these templates for you now, which you can then apply to specific projects?",
      "I've scheduled the premium subscription transfer from jane@company.com to robert@company.com effective next Monday (May 15th). Both users will receive email notifications about this change. Jane will have access until Sunday midnight, after which Robert will need to login to activate his subscription. All of Jane's saved preferences and configurations will be transferred, but her personal data and private files will not be included in the transfer. Would you like Robert to receive an onboarding email with instructions for accessing the transferred subscription?",
      "I've enabled mandatory two-factor authentication for your organization with the following settings: 1) Authenticator app only (SMS and email options disabled) 2) 14-day compliance period starting today 3) Account restrictions will apply after the compliance deadline. All users will receive an email notification about this requirement, and they'll be prompted to set up 2FA upon their next login. As an admin, you'll receive a compliance report after 7 days and again after the 14-day deadline. Is there anything else you'd like to customize about this 2FA implementation?",
      "I've implemented geographic access restrictions for your account, blocking access from Russia, China, and North Korea as requested. These restrictions are effective immediately. Any login attempts from these countries will be automatically blocked, and a security alert will be sent to your security team email. Would you like me to add any additional countries to this restriction list? Also, would you like to set up an exception process for legitimate users who might be traveling to these regions?",
      "I've initiated the primary contact change process from Michael Brown to Sarah Johnson (sarah.johnson@company.com). Michael has been sent an authorization request email which he'll need to approve. Once approved, Sarah will receive an email to confirm acceptance of the primary contact role. This change should be completed within 24 hours after both parties confirm. Is there anything specific Sarah needs to know about her new responsibilities as the primary contact?",
      "I've created a custom 'Content Reviewer' role for your organization with the following permissions: Can view all content, Can approve/reject content submissions, Can leave comments and feedback, Cannot create new content, Cannot delete content, Cannot invite new users, Can access analytics in read-only mode. This role is now available in your Admin Dashboard and can be assigned to users. Would you like me to assign this role to specific team members now, or would you prefer to do that yourself?"
    ]
  }
];

// Advanced customer service scenarios
const advancedConversations = [
  {
    category: "technical",
    customerQueries: [
      "I need to integrate your API with our CRM system. Where can I find the documentation?",
      "The data export feature is giving me corrupted CSV files. I've tried multiple times.",
      "We're experiencing intermittent connection issues with your service during peak hours. It's affecting our business operations.",
      "The two-factor authentication isn't working with my new phone. I need to transfer it from my old device.",
      "I'm trying to implement SSO for my team but getting 'Invalid configuration' errors.",
      "We need to set up an automated workflow that triggers actions in your system based on events in our internal tools.",
      "Your system doesn't seem to be compliant with our company's data residency requirements for EU customers.",
      "The custom report generation is taking hours to complete. Is this normal performance?",
      "We need to migrate 50,000 users from our legacy system to your platform. What's the best approach?",
      "The audit logs don't seem to capture all user actions as required by our compliance team."
    ],
    agentResponses: [
      "You can find our API documentation at developers.ourcompany.com. For CRM-specific integration, I recommend checking the 'Enterprise Integration' section. Would you like me to provide specific endpoints for your CRM system?",
      "I apologize for the issue with corrupted exports. This could be happening due to timeout during large data transfers. Could you tell me approximately how many records you're trying to export? In the meantime, I'll create a direct secure download link for your data.",
      "I apologize for the intermittent connection issues. Our monitoring system has indeed detected increased latency during peak hours (2-4 PM IST). Our engineering team is actively working on scaling up the infrastructure. Could you share which specific services are most affected?",
      "For transferring 2FA to a new device, you'll need your recovery codes that were provided when you first set up 2FA. Do you have access to these codes? If not, we can verify your identity through alternative means and help reset your 2FA.",
      "I understand implementing SSO can be challenging. The 'Invalid configuration' error typically occurs when the IdP metadata doesn't match our SP requirements. Could you share which identity provider you're using and the exact error message? I can provide specific configuration parameters for your IdP.",
      "We offer several options for automated workflows with external systems. Our Enterprise API supports webhooks that can trigger actions based on events in your internal tools. Additionally, we integrate with automation platforms like Zapier and Microsoft Power Automate. Could you tell me more about the specific workflows you're trying to automate so I can recommend the best approach?",
      "Data residency is an important concern. Our Enterprise+ plan offers regional data hosting options, including EU-only data storage in our Frankfurt and Dublin data centers. This ensures compliance with GDPR and other EU data sovereignty requirements. Could you specify which specific residency requirements you need to meet so I can verify our compliance?",
      "Custom report generation time depends on the complexity and data volume involved. However, taking hours is not typical for most reports. Could you share which specific report template you're using and approximately how much data it's processing? I can investigate if there's an optimization issue or if you might benefit from our new analytics engine.",
      "Large-scale migrations require careful planning. We offer a specialized migration service for Enterprise customers moving 10,000+ users. This includes a dedicated migration specialist, custom data mapping, phased transition, and verification procedures. The process typically takes 2-4 weeks depending on complexity. Would you like me to arrange a consultation with our migration team to discuss your specific requirements?",
      "Our audit logging system should capture all user actions within the platform. For Enterprise security and compliance customers, we offer enhanced audit logging which captures additional system events and metadata. Could you specify which particular actions seem to be missing from your logs? I'd like to investigate whether this is a configuration issue or a potential gap in our logging."
    ],
    customerFollowups: [
      "Thanks. We use Salesforce CRM. Do you have any specific documentation for Salesforce integration?",
      "I'm trying to export about 50,000 records. A direct download link would be helpful.",
      "The order processing and inventory sync APIs seem to be the most affected. We're seeing timeouts increasing by 300% during those hours.",
      "I don't have the recovery codes. I didn't save them when setting up 2FA initially.",
      "We're using Okta as our IdP. The exact error is: 'Error code: ACS-1002, Invalid assertion consumer service URL'.",
      "We need to trigger customer record updates in your system whenever a customer status changes in our ERP system. This needs to happen in real-time.",
      "We need to ensure that all data from our German customers remains within EU borders and is not transferred to US data centers at any point.",
      "We're using the 'Comprehensive Customer Behavior Analysis' template with about 18 months of data covering approximately 2 million customer interactions.",
      "We need to migrate users, their historical data, custom templates, and permission structures. How do we maintain user-specific settings during migration?",
      "Our compliance requirements specifically need logging of all data export events, field-level changes to sensitive customer information, and admin permission changes."
    ],
    agentFollowups: [
      "Yes, we have Salesforce-specific integration documentation. I'm sharing the link: developers.ourcompany.com/integration/salesforce. This includes sample code, API endpoints, and authentication methods tailored for Salesforce. Additionally, we offer a Salesforce app on the AppExchange that simplifies the integration process. Would you like information about that as well?",
      "I understand. Exporting 50,000 records at once can cause timeout issues. I've created a secure, direct download link for your data that will bypass the timeout restrictions: secure.ourcompany.com/export/data (valid for 48 hours). For future large exports, I recommend using our batch export API which handles large volumes better. Would you like me to send documentation for that approach?",
      "Thank you for that specific information. I've escalated this to our infrastructure team with priority. They've identified a bottleneck in our processing queue that's affecting these specific APIs. A fix is being deployed tonight at 2:00 AM UTC to increase capacity. I've also added your account to our priority queue in the meantime, which should reduce timeouts by routing your requests through dedicated servers.",
      "No problem. We can verify your identity through alternative means. I've just sent a verification link to your registered email address. Once you complete this verification, you'll receive instructions to set up 2FA on your new device without needing the recovery codes. For future reference, I strongly recommend saving the recovery codes for any new 2FA setup.",
      "Thank you for providing that specific error. The ACS-1002 error occurs when the Assertion Consumer Service URL in Okta doesn't match what our system expects. For Okta, the correct ACS URL should be: https://auth.ourcompany.com/sso/okta/acs. Please update this in your Okta dashboard under the application settings. Additionally, ensure the Entity ID is set to: https://auth.ourcompany.com/sso/metadata. Would you like me to send our complete Okta configuration guide?",
      "For real-time ERP integration, I recommend using our webhook API. Here's the process: 1) Configure a webhook endpoint in our system (API > Webhooks > Create) that listens for customer status changes 2) Set up an automation in your ERP to call this webhook whenever a customer status changes 3) Our system will process these in real-time with typical latency under 2 seconds. I'm sending detailed webhook configuration documentation to your email. Would you also like access to our sandbox environment to test this integration before deploying to production?",
      "I can confirm that our EU data centers (Frankfurt and Dublin) are fully isolated from our US infrastructure and comply with all German and EU data protection requirements. For your German customers, I recommend configuring data residency rules in the admin console under 'Compliance > Data Residency' and selecting 'EU Only' for the German customer segment. This ensures their data never leaves the EU, even for processing or backup purposes. Would you like me to help you configure these settings or provide our detailed documentation on data sovereignty compliance?",
      "The Comprehensive Customer Behavior Analysis report with that volume of data would benefit from our new analytics engine. I've checked your account and see you're still on our legacy reporting infrastructure. I've upgraded your account to our new high-performance analytics cluster at no additional cost. This should reduce report generation time from hours to approximately 15-20 minutes for this volume of data. The upgrade will take effect within the next hour. Would you like me to schedule the report to run automatically once the upgrade is complete?",
      "For a comprehensive migration of that scale with all the elements you mentioned, we'll assign you a dedicated migration specialist. The process will include: 1) Data mapping workshop to align fields and structures 2) Custom scripts for user preferences and settings 3) Staged migration with validation at each step 4) Parallel run period where both systems operate 5) Permission mapping and verification. I've initiated a request for our migration team to contact you within the next business day to schedule an initial consultation. Is there a specific timeline you're working with for this migration?",
      "Thank you for those specific compliance requirements. I've checked your current audit configuration and found that while admin permission changes are being logged correctly, the data export events and field-level changes might not be capturing all required information. I recommend enabling our 'Enhanced Compliance Logging' feature (Security > Audit Settings > Enhanced Mode) which specifically covers these areas. Additionally, you can configure real-time alerts for sensitive data access under 'Alert Policies'. Would you like me to enable these features for your account, or would you prefer to review the detailed documentation first?"
    ]
  },
  {
    category: "technical",
    customerQueries: [
      "We need a disaster recovery plan for our enterprise data stored in your system. What options do you offer?",
      "Your accessibility features don't meet our company's WCAG 2.1 AA compliance requirements. How can we address this?",
      "We need to implement complex conditional access policies based on user risk scores and device compliance.",
      "The machine learning models in your analytics platform are generating inconsistent predictions for our dataset.",
      "We need to support 50+ languages in our customer portal that uses your embedded widgets. Is this possible?",
      "Your JavaScript SDK is conflicting with our existing frontend framework. How can we resolve this?",
      "We need to establish an encrypted dedicated connection between our data center and your cloud. Is this possible?",
      "We're experiencing race conditions in concurrent operations that are causing data integrity issues.",
      "Your GraphQL API performance degrades significantly when we query nested relationships more than 3 levels deep.",
      "We need to implement custom authentication flow for IoT devices connecting to your platform."
    ],
    agentResponses: [
      "Disaster recovery is critical for enterprise data. We offer multiple DR options: 1) Automated backups with 30/60/90-day retention policies 2) Cross-region replication with RPO of 15 minutes and RTO of 1 hour 3) Continuous data protection with point-in-time recovery. All Enterprise plans include our standard DR package, with enhanced options available. What specific recovery objectives (RPO/RTO) does your organization require?",
      "We take accessibility very seriously. While our platform meets most WCAG 2.1 AA requirements, we recognize there are specific areas needing improvement. We offer an Enterprise Accessibility Pack that includes: 1) Enhanced keyboard navigation 2) Screen reader optimizations 3) Custom contrast settings 4) Accessibility-focused API extensions. Could you share which specific WCAG criteria you're finding us non-compliant with so we can address those directly?",
      "Our Enterprise Security package supports complex conditional access policies. You can define rules based on: user risk scores (from our AI system or imported from your security tools), device compliance status, location, time of day, requested resource sensitivity, and authentication strength. These can be combined using AND/OR logic with nested conditions. Would you like me to share our conditional access documentation or set up a demo with our security specialist?",
      "I understand that inconsistent ML predictions can be frustrating. This typically happens when the model hasn't been properly tuned for your specific data patterns. Our data science team offers model customization services where we can: 1) Analyze your specific dataset 2) Fine-tune our models or develop custom models 3) Validate performance against your expected outcomes. Could you share more details about the specific analytics module and types of inconsistencies you're seeing?",
      "Yes, our embedded widgets support multi-language implementation through our i18n framework. We currently support 38 languages out-of-the-box, and you can add custom language packs for additional languages. For Enterprise customers, we offer professional translation services for custom elements. The widgets detect the user's browser language preference automatically, or you can programmatically set the language. Would you like documentation on implementing multiple languages in our widget framework?",
      "JavaScript framework conflicts can be challenging. To resolve this: 1) We offer a 'no-conflict mode' for our SDK that isolates it from global namespace 2) We have an AMD/CommonJS compatible version 3) For severe conflicts, our lightweight API-only version can be used instead of the full SDK. Could you share which frontend framework you're using and the specific conflicts you're experiencing so I can provide more targeted guidance?",
      "Yes, we support dedicated connections through several options: 1) AWS Direct Connect / Azure ExpressRoute / Google Cloud Interconnect depending on which cloud region you're connecting to 2) IPsec VPN with dedicated throughput guarantees 3) Private Link / VPC Endpoint integration. All connections support AES-256 encryption and can be configured with custom routing policies. What's your current data center connectivity infrastructure and approximate bandwidth requirements?",
      "Race conditions in concurrent operations typically occur with high-throughput workloads. To resolve this: 1) We offer optimistic concurrency control via ETag headers 2) For Enterprise customers, we provide dedicated database instances with configurable isolation levels 3) Our transaction API allows you to group operations atomically. Could you describe the specific operations that are experiencing race conditions so I can recommend the most appropriate solution?",
      "Deep nested GraphQL queries can indeed impact performance. To address this: 1) We've recently implemented query complexity analysis which you can enable in your admin console 2) You can use our DataLoader pattern to batch and cache requests 3) For Enterprise customers, we offer dedicated GraphQL instances with enhanced query optimization. Would you like me to enable these optimizations for your account and provide guidance on restructuring problematic queries?",
      "We support custom authentication flows for IoT devices through several mechanisms: 1) Certificate-based authentication with device certificates 2) OAuth 2.0 device flow 3) API key rotation with custom validation logic 4) For Enterprise customers, we offer a dedicated IoT authentication service with device-specific policies. What type of IoT devices are you working with, and what are your specific authentication requirements?"
    ],
    customerFollowups: [
      "We need an RPO of 5 minutes and RTO of 30 minutes maximum for our critical financial data.",
      "We're particularly concerned about keyboard navigation in your dashboard widgets and color contrast in the data visualization components.",
      "We want to restrict access to sensitive data when users are on unmanaged devices or when accessing from certain high-risk countries.",
      "We're using the Customer Churn Prediction model. It's giving wildly different results for similar customer profiles in different regions.",
      "We need to support right-to-left languages like Arabic and Hebrew. Do your widgets handle RTL text properly?",
      "We're using React with Redux and Material-UI. Your SDK is conflicting with our state management and causing memory leaks.",
      "We have a Cisco SD-WAN infrastructure with about 500Mbps average traffic to your services. We need end-to-end encryption.",
      "The race conditions occur during simultaneous updates to hierarchical project structures, particularly when moving nodes between parents.",
      "We regularly need to query customer > orders > items > manufacturing details > component origins for compliance reporting.",
      "We have industrial sensors using MQTT protocol with limited computing power. We need a lightweight auth mechanism that can work with constrained devices."
    ],
    agentFollowups: [
      "For your financial data with an RPO of 5 minutes and RTO of 30 minutes, I recommend our Enterprise+ Disaster Recovery package with the following configuration: 1) Continuous Data Protection (CDP) with transaction log shipping at 1-minute intervals 2) Standby hot instances in an alternate region with automatic failover 3) Dedicated recovery team with 24/7 availability. This package exceeds your requirements with an actual RPO of 1 minute and typical RTO of 10-15 minutes. I'll have our solutions architect contact you to prepare a custom implementation plan tailored to your financial data workflows. Would you like to proceed with this solution?",
      "Thank you for identifying those specific accessibility concerns. You're right that these areas need improvement. I've arranged for immediate improvements: 1) We're deploying our enhanced keyboard navigation module to your account within 48 hours, which brings full ARIA compliance and focus management to all dashboard widgets 2) For data visualization, I'm enabling our high-contrast visualization theme which meets WCAG 2.1 AA 4.3:1 contrast requirements. Additionally, I've assigned our accessibility specialist to audit your specific implementation next week and provide custom recommendations. Would you like to schedule a call with our accessibility team to discuss other specific concerns?",
      "For your conditional access requirements, I recommend implementing our Advanced Security Policies: 1) Create a device compliance policy requiring device management enrollment for sensitive data access 2) Set up a geo-blocking policy for high-risk countries with optional override via step-up authentication 3) Configure sensitivity labels for your data with conditional access requirements for each level. I've shared a configuration template to your email that includes these policies. Our security engineer can assist with implementation - would you like to schedule a session with them to configure these policies for your specific environment?",
      "After reviewing your case, I understand the issue with the Customer Churn Prediction model across regions. This inconsistency typically stems from regional data variations not being properly accounted for in the model. I've engaged our data science team to analyze your specific dataset. They'll perform: 1) Regional bias analysis 2) Feature importance comparison across regions 3) Model calibration specifically for your customer segments. Within 3 business days, they'll provide a custom-tuned model variant along with a detailed analysis explaining the previous inconsistencies. Would you like them to schedule a review session to explain their findings once complete?",
      "Yes, our widgets fully support RTL languages including Arabic and Hebrew. The RTL support includes: 1) Automatic text direction handling 2) Mirrored UI elements and navigation 3) Properly aligned input fields and validation messages 4) Correctly ordered data presentation in tables and charts. To implement this: enable the RTL option in the widget configuration and set the language code to your desired RTL language. I'm sending you our RTL implementation guide with specific code examples for Arabic and Hebrew. Would you also like access to our internationalization testing tools to verify the implementations?",
      "For React with Redux and Material-UI conflicts, we have a specific compatibility solution: 1) I'm providing access to our React-specific SDK variant that uses React hooks and is compatible with Redux 2) This version isolates component rendering to prevent Material-UI conflicts 3) It implements proper cleanup functions to prevent the memory leaks you're experiencing. I've emailed the installation guide with sample code to properly integrate with your stack. Our front-end specialist can provide a code review of your integration - would that be helpful for your development team?",
      "For your Cisco SD-WAN with 500Mbps traffic requirements, I recommend our Direct Connect Plus solution: 1) We'll provision a dedicated connection to your nearest region with guaranteed 1Gbps throughput (twice your average for headroom) 2) End-to-end encryption using AES-256-GCM with automated key rotation 3) BGP routing with your existing Cisco infrastructure 4) 99.99% SLA with < 10ms latency. I've initiated the provisioning request and our network engineer will contact you within 24 hours to coordinate the implementation details with your network team. Is there a specific timeline you're working with for this connectivity?",
      "For the hierarchical project structure race conditions, I recommend implementing our Transactional API with optimistic locking: 1) Use our batch update endpoint for moving multiple nodes 2) Implement ETag validation to detect concurrent modifications 3) Enable our hierarchical cache that maintains referential integrity. I'm granting you access to our advanced concurrency control documentation and sample code specifically for hierarchical data structures. Additionally, I've configured your account for higher database isolation levels (Serializable) during tree operations. Would you like our solutions architect to review your specific implementation?",
      "For your deep nested GraphQL queries, I'm implementing three solutions for your account: 1) Enabling our new GraphQL query optimizer that specifically handles deep hierarchical queries 2) Implementing automatic field-level caching for manufacturing and component data 3) Creating a custom composite field that flattens the deeply nested structure for compliance reporting. These changes will reduce query time from seconds to milliseconds. I've also added your account to our high-performance GraphQL tier at no additional cost. A detailed implementation guide has been sent to your email. Would you like to schedule a query optimization workshop with our data engineers?",
      "For your industrial MQTT sensors with limited computing power, I recommend our Lightweight IoT Authentication protocol: 1) Pre-shared key authentication with minimal cryptographic overhead 2) Token-based session management with extended validity periods to reduce authentication frequency 3) Batch authentication for groups of similar devices. This approach requires only 4KB of memory on the device and minimal CPU usage while maintaining security. I've granted you access to our IoT authentication SDK and sample code for constrained devices. Our IoT specialist can help with implementation - would you like to arrange a technical consultation?"
    ]
  }
];

// Specialized product conversations
const specializedConversations = [
  {
    category: "product",
    customerQueries: [
      "I need to migrate from the Basic plan to Enterprise. What's the process and downtime?",
      "Does your platform comply with GDPR and CCPA regulations? We're expanding to Europe.",
      "Can your system handle custom fields for our industry-specific requirements?",
      "We're experiencing slow performance with concurrent users. What's your recommendation?",
      "What security certifications does your platform have? We need this for compliance.",
      "How does your platform handle data segregation for multi-tenant environments?",
      "We need to implement custom workflows that aren't supported by your standard templates.",
      "What kind of AI capabilities does your platform offer for predictive analytics?",
      "We need to integrate your system with our legacy mainframe applications. Is this possible?",
      "How scalable is your solution? We're planning to grow from 100 to 10,000 users next year."
    ],
    agentResponses: [
      "Great to hear you're considering our Enterprise plan! The migration is managed by our dedicated onboarding team with minimal disruption. Typically, the process takes 24-48 hours, with actual downtime of less than 30 minutes, scheduled during your lowest usage period. Would you like to schedule a call with our migration specialist?",
      "Yes, our platform is fully compliant with both GDPR and CCPA regulations. We provide data processing agreements, right to be forgotten functionality, data export capabilities, and all required privacy controls. We also maintain a comprehensive compliance documentation package that I'd be happy to share with your legal team.",
      "Absolutely! Our Enterprise plan supports unlimited custom fields across all modules. You can create industry-specific fields with various data types including text, number, date, picklist, formula, and even relational fields. We also offer a custom taxonomy engine for complex hierarchical data structures. Would you like a demonstration?",
      "I understand performance is critical for your business. For concurrent user scenarios, we recommend implementing our caching layer and connection pooling. With Enterprise plans, you also get dedicated database resources that aren't shared with other customers. What's your current user concurrency peak, and how many simultaneous users are you planning for?",
      "We maintain SOC 2 Type II, ISO 27001, HIPAA compliance (for healthcare data), and PCI DSS Level 1 for payment processing. Our platform undergoes quarterly security audits and penetration testing by third-party security firms. I'd be happy to share our attestation reports under NDA for your compliance team to review.",
      "Our platform handles multi-tenant data segregation through several layers of security: 1) Physical database separation for Enterprise+ customers 2) Logical partitioning with row-level security for Enterprise customers 3) Encrypted tenant identifiers in all data stores. This ensures complete data isolation between tenants while maintaining performance. Would you like more details about our specific implementation approach?",
      "Yes, we support fully customizable workflows through our Enterprise Workflow Engine. This allows you to create complex, conditional workflows with: custom approval hierarchies, dynamic routing based on content or metadata, integration with external systems, and automated actions. Our professional services team can help implement these. Would you like a consultation to discuss your specific workflow requirements?",
      "Our AI capabilities include: predictive analytics using supervised machine learning models, anomaly detection for identifying unusual patterns, sentiment analysis for text data, recommendation engines based on collaborative filtering, and forecasting tools for time-series data. These can be applied to various business metrics to predict outcomes like customer churn, revenue forecasting, and inventory optimization. Which areas are you most interested in applying AI to?",
      "Yes, we can integrate with legacy mainframe systems through several approaches: 1) Our IBM z/OS connector for direct mainframe integration 2) MQ Series message queuing for asynchronous communication 3) Batch file transfers with ETL processing 4) API-enabled middleware like IBM AppConnect. Which mainframe system are you currently running, and what type of data exchange are you looking to establish?",
      "Our platform is highly scalable, designed specifically for enterprise growth. We've supported customers growing from 100 to over 50,000 users. For your projected growth: 1) Our elastic infrastructure automatically scales 2) The database layer uses sharding for performance 3) We implement progressive caching as user numbers increase. We'll assign a dedicated scalability engineer to monitor your growth and make proactive adjustments. Would you like to discuss a customized scaling plan for your specific growth trajectory?"
    ],
    customerFollowups: [
      "Yes, I'd like to schedule that call. We need to migrate by the end of this month. Also, what happens to our existing integrations?",
      "That sounds good. Please send the compliance documentation. Also, do you have any EU-based data centers?",
      "Yes, a demonstration would be helpful. We need to track specialized manufacturing workflows with conditional logic.",
      "We currently have about 200 concurrent users, but expect to grow to 500+ by year end as we expand.",
      "Please share those reports. Also, do you support custom security policies or is everything predefined?",
      "We need to ensure complete data isolation between our clients. Can you explain how you prevent data leakage between tenants?",
      "We have a three-stage approval process that changes based on transaction value and customer type. Can your system handle this?",
      "We're interested in predicting customer churn and identifying upsell opportunities based on usage patterns.",
      "We're running IBM z/OS with COBOL applications. We need real-time data synchronization with minimal mainframe resource usage.",
      "What kind of performance benchmarks do you have for 10,000+ user environments? Are there any architectural changes needed at that scale?"
    ],
    agentFollowups: [
      "I've scheduled a call with our migration specialist for tomorrow at 2:00 PM your time. You'll receive a calendar invite shortly. Regarding your integrations, all standard integrations will continue to work seamlessly. For custom integrations using our API, the endpoints remain the same, but you'll get access to enhanced Enterprise-only endpoints. Our specialist will provide a pre-migration checklist that includes validation steps for all your integrations.",
      "I've emailed our comprehensive GDPR and CCPA compliance documentation to your address. Yes, we operate multiple data centers in the EU - specifically in Frankfurt, Dublin, and Amsterdam. Enterprise customers can select their preferred data residency location. This ensures all your European customers' data remains within EU borders, simplifying your compliance requirements.",
      "I've arranged for a specialized demonstration of our custom fields and workflow engine with our product specialist. You'll receive a calendar invite for Thursday at 10:00 AM. They'll specifically focus on manufacturing workflows and conditional logic scenarios. We've successfully implemented similar systems for other manufacturing clients and can share anonymized templates that might align with your needs.",
      "With your projected growth to 500+ concurrent users, I recommend our Enterprise Plus plan which includes dedicated application servers in addition to dedicated database resources. This will ensure consistent performance as you scale. Our technical architect will join tomorrow's call to discuss your specific architecture needs and can provide benchmark data for similar customer loads.",
      "I've sent the security attestation reports to your compliance team via secure email. Regarding security policies, we support both predefined policies and custom security models. Enterprise customers can implement custom role-based access control, IP restrictions, session policies, password policies, and even integrate with your existing IAM solution. We also support custom security audit logs that can be streamed to your SIEM solution.",
      "For complete data isolation, we implement multiple security layers: 1) Each tenant has unique encryption keys for data at rest 2) Our query engine enforces tenant context on every database operation with no exceptions 3) Tenant identifiers are cryptographically verified for each request 4) We perform regular data isolation penetration testing 5) Enterprise+ customers receive physically isolated database instances. We also offer detailed audit logs that track all cross-tenant access attempts, which are reviewed by our security team and available to you. Would you like me to share our multi-tenant security whitepaper that details our complete isolation architecture?",
      "Yes, our system can absolutely handle your three-stage approval process. Here's how we would implement it: 1) Create conditional rules based on transaction value thresholds 2) Define different approval chains for each customer type 3) Configure automatic routing logic that changes based on both factors 4) Implement escalation paths for delayed approvals. Our workflow engine is specifically designed for complex conditional scenarios like yours. During your implementation, our solution architect will work with you to map out these exact processes and ensure they're configured optimally for your business rules.",
      "For your customer churn and upsell prediction needs, I recommend our Advanced Analytics suite which includes: 1) Customer behavior modeling that identifies pre-churn indicators based on usage patterns, support interactions, and engagement metrics 2) Propensity modeling for upsell potential based on feature usage, industry benchmarks, and growth patterns 3) Recommendation engine that suggests specific products/features based on similar customer profiles. We've seen customers reduce churn by 23% on average with these tools. Would you like a demo of these specific AI capabilities applied to a sample of your customer data?",
      "For your IBM z/OS COBOL environment, I recommend our Mainframe Direct Connect solution. This uses: 1) Lightweight CICS transaction gateway with minimal MIPS consumption 2) Optimized data mapping between COBOL copybooks and our data structures 3) Near real-time synchronization with batch fallback options 4) Connection pooling to minimize mainframe resource utilization. We've successfully implemented this with other IBM z/OS customers, achieving sub-second synchronization with less than 5% mainframe overhead. Our mainframe integration specialist can provide a detailed technical proposal tailored to your specific environment and performance requirements.",
      "For environments with 10,000+ users, our performance benchmarks show response times under 500ms for 95% of transactions with proper configuration. At your scale, we recommend these architectural adjustments: 1) Implementing our distributed cache architecture 2) Enabling read replicas for reporting workloads 3) Setting up geographic routing for optimal user experience 4) Configuring workload-specific processing nodes. These changes aren't required immediately but should be implemented as you pass 2,500 concurrent users. Our scalability team will proactively monitor your growth and recommend when each optimization should be applied, ensuring seamless performance throughout your expansion."
    ]
  },
  {
    category: "product",
    customerQueries: [
      "How does your product handle data sovereignty requirements for different countries?",
      "We need to provide different user experiences based on user roles but maintain a consistent interface.",
      "What's your product roadmap for the next 12 months? We're evaluating long-term fit.",
      "How customizable are your reporting dashboards for executive-level presentations?",
      "We need to integrate IoT device data streams with your analytics platform. Is this supported?",
      "How does your solution handle data archiving and retention policies for regulatory compliance?",
      "Can your platform handle multiple business units with different configurations but centralized reporting?",
      "We need sub-processor agreements with all your infrastructure providers. Can you provide these?",
      "How do you handle zero-day vulnerabilities and security patching in your product?",
      "Our industry has specific calculation methodologies. Can your system be customized to implement these?"
    ],
    agentResponses: [
      "Data sovereignty is a core capability of our Enterprise platform. We maintain regional data centers in North America, EU, UK, Australia, and Asia-Pacific regions. Each center complies with local regulations including GDPR, CCPA, PIPEDA, and APPI. Our data residency controls allow administrators to define exactly where specific data can be stored and processed. For multi-national deployments, we offer data routing policies that ensure compliance with cross-border transfer restrictions. How specific are your data sovereignty requirements?",
      "Our role-based experience engine is designed precisely for this scenario. It provides consistent interface elements while dynamically adjusting functionality, data access, and feature availability based on user roles. Administrators can configure which elements are visible to specific roles, create custom dashboards per role, and set permission-based navigation paths. We also support contextual help and onboarding experiences tailored to each role. Would you like to see examples of how other customers have implemented role-based experiences?",
      "Our product roadmap for the next 12 months focuses on: AI-enhanced analytics (Q3), expanded integration capabilities with 15+ new connectors (Q2-Q4), enhanced mobile experiences including offline capabilities (Q2), advanced automation workflows (Q3), and improved governance tools for enterprise compliance (Q4). For Enterprise customers, we provide quarterly roadmap briefings with our product team and opportunities to influence prioritization. Would you like me to arrange a detailed roadmap presentation with our product leadership?",
      "Our executive dashboards are highly customizable, designed specifically for C-level presentations. You can create white-labeled reports with your company branding, customize visualization types beyond standard charts, implement interactive elements for real-time exploration during presentations, and set up automatic data refreshes before scheduled meetings. We also offer a presentation mode optimized for large screens and projection systems. Many of our Enterprise customers create dashboard templates specific to board meetings and executive reviews. Would you like a demonstration of these capabilities?",
      "Yes, our analytics platform has robust IoT integration capabilities. We support various IoT data ingestion methods including MQTT, AMQP, and direct API connections. Our time-series database is optimized for IoT data patterns, handling millions of data points with millisecond query performance. For real-time analytics, we offer stream processing that can trigger alerts and actions based on IoT data patterns. We've implemented IoT analytics solutions across manufacturing, healthcare, logistics, and smart building sectors. What types of IoT devices are you looking to integrate with?",
      "Our platform includes comprehensive data lifecycle management capabilities for regulatory compliance. You can define granular retention policies at the data category level, implement automated archiving rules based on data age or trigger events, and configure compliant deletion workflows with appropriate approvals. For regulated industries, we support legal holds that override normal retention policies when necessary. All data lifecycle events are fully auditable with tamper-evident logs. Which specific regulations govern your retention requirements?",
      "Yes, our multi-business unit architecture is specifically designed for this scenario. Each business unit can have its own configuration, workflows, fields, and security model while still providing consolidated reporting across the enterprise. Our hierarchical data model allows headquarters to access aggregated data from all business units while maintaining appropriate access controls. We also support business-unit-specific branding and customizations. This model is popular with our multinational and holding company customers. Would you like to discuss how this would work for your specific organizational structure?",
      "Yes, we maintain comprehensive sub-processor agreements with all our infrastructure providers that can be extended to our customers. Our legal team prepares DPA packets for Enterprise customers that include all necessary sub-processor documentation, including AWS, Google Cloud, Azure, CDN providers, and monitoring services. These agreements are regularly updated to reflect any changes in our infrastructure. For EU customers, we ensure all sub-processor agreements comply with Standard Contractual Clauses. I'd be happy to connect you with our legal team to provide these documents or answer specific questions about our sub-processors.",
      "We have a robust security protocol for vulnerability management. Our approach includes: 1) Continuous monitoring of security advisories and threat intelligence 2) Regular penetration testing by third-party security firms 3) A dedicated security response team available 24/7 4) Automated vulnerability scanning across our infrastructure. For critical zero-day vulnerabilities, our average patch deployment time is under 4 hours. We also maintain isolated environments that can be rapidly deployed if necessary while patches are being developed. All security activities are documented in our monthly security bulletins provided to Enterprise customers. Would you like more details about our security practices?",
      "Our calculation engine is designed for industry-specific customization. You can implement custom formulas, create proprietary algorithms using our expression language, integrate with external calculation services via API, and define complex multi-step calculation processes. We've implemented specialized calculations for insurance underwriting, financial services risk modeling, pharmaceutical trial analysis, and energy sector forecasting. Our professional services team can help implement your specific methodologies. Could you share more about the particular calculations your industry requires?"
    ],
    customerFollowups: [
      "We need to ensure that data from our European customers never leaves the EU, even for processing or backup purposes.",
      "Yes, I'd like to see examples. Specifically, how granular can the permissions be? Can we hide specific fields or buttons based on user role?",
      "Yes, a roadmap presentation would be helpful. We're particularly interested in your AI capabilities roadmap since that's a strategic focus for us next year.",
      "Can we embed real-time data visualizations in our PowerPoint presentations for board meetings? This has been a challenge with our current tools.",
      "We manufacture smart industrial equipment with sensors that produce temperature, pressure, and vibration data via MQTT. We need anomaly detection for predictive maintenance.",
      "We're in the healthcare industry, so we need to comply with HIPAA retention requirements and also have specific retention policies for different types of patient data.",
      "We have 5 business units across 3 countries, each with different operational processes, but management needs consolidated analytics and financial reporting.",
      "Yes, please connect me with your legal team. We specifically need to review any sub-processors who might handle healthcare data subject to HIPAA.",
      "What's your average time to patch critical vulnerabilities? Do you have a formal vulnerability disclosure policy we can review?",
      "We're in the insurance industry and need to implement custom actuarial calculations for risk assessment that vary by jurisdiction."
    ],
    agentFollowups: [
      "I understand your EU data requirements. We can absolutely ensure European customer data never leaves the EU through our strict data residency controls. Here's how we implement this: 1) Physical data storage in our Frankfurt and Dublin data centers with data-at-rest encryption 2) Processing-location restrictions that ensure even temporary computational resources remain within EU boundaries 3) Backup and disaster recovery sites exclusively within the EU (secondary site in Amsterdam) 4) EU-based support personnel for any cases requiring data access. I'll have our compliance team prepare a detailed EU data boundary implementation plan for your review that includes the specific technical and procedural controls we implement to maintain absolute data sovereignty within EU borders.",
      "I'm happy to show you examples of our role-based permissions. Our granularity extends to the field level and UI component level - meaning you can hide specific fields, buttons, menu items, tabs, and even portions of a page based on user role. For example, one customer in financial services shows transaction amounts to managers but hides them from service representatives, while another customer in healthcare shows different patient information to doctors versus administrative staff. Beyond visibility, you can also implement role-based business rules where the same button might trigger different workflows depending on who clicks it. I've shared access to our permission configuration demo environment where you can experiment with these capabilities directly. Would you also like a guided tour of these features with one of our solution architects?",
      "I've arranged a comprehensive roadmap presentation with our Chief Product Officer for next Tuesday at 10AM your time. You'll receive a calendar invitation shortly. Since AI capabilities are your strategic focus, the presentation will emphasize our AI roadmap, including: 1) Our new predictive analytics engine launching in Q3 2) Natural language processing enhancements for automated data analysis 3) Computer vision capabilities for document processing 4) Our API connectivity to specialized AI models like OpenAI and HuggingFace 5) The extensibility framework for integrating your own AI models. The session will include time for Q&A about how these capabilities align with your strategic initiatives. Would you like any other specific areas covered during this presentation?",
      "Yes, we provide seamless integration with PowerPoint for board presentations. Our solution offers: 1) A PowerPoint add-in that embeds live, refreshable data visualizations directly in your slides 2) The ability to set automatic refresh intervals, so data is always current when you present 3) Interactive elements that allow drill-down during presentations if questions arise 4) Snapshot capability to preserve point-in-time data if needed. Many of our customers use this for board meetings to ensure they're presenting the most current information without manual updates. I've emailed you our PowerPoint integration guide and a sample presentation that demonstrates these capabilities. Would you like a brief tutorial on setting this up for your specific reports?",
      "Your industrial IoT scenario is well-suited for our platform. For your temperature, pressure, and vibration sensors communicating via MQTT, we recommend: 1) Direct MQTT broker integration with our IoT gateway 2) Real-time stream processing for immediate anomaly detection 3) Our machine learning-based predictive maintenance module that's specifically trained for industrial equipment. This solution can detect developing issues typically 2-4 weeks before failure by recognizing subtle pattern changes across multiple sensor inputs. We've implemented similar solutions for manufacturing clients with 85%+ accuracy in predicting equipment failures. I've scheduled our IoT solutions specialist to contact you tomorrow to discuss your specific equipment profiles and sensor data patterns to provide a tailored implementation plan.",
      "For healthcare data subject to HIPAA, our platform provides specialized retention capabilities: 1) Configurable retention rules based on record type (e.g., different policies for diagnostic images versus billing records) 2) Automated enforcement of minimum retention periods with appropriate logging 3) Secure archiving to lower-cost storage while maintaining accessibility and compliance 4) Configurable purge workflows with required approvals and complete audit trails. We'll assign our healthcare compliance specialist to work with you on mapping your specific patient data types to the appropriate retention policies. They can also help implement any state-specific requirements that exceed HIPAA standards. Would you like to schedule a compliance mapping workshop with our healthcare team?",
      "Our multi-business unit architecture is perfect for your structure with 5 business units across 3 countries. Here's how we'll implement it: 1) Each business unit gets its own configured environment with appropriate localization and process customization 2) Cross-business security controls determine what data can be shared upward for consolidated reporting 3) Corporate reporting dashboards aggregate key metrics while maintaining drill-down capability to individual business units 4) Shared master data can be maintained centrally while allowing business-unit-specific extensions. Our professional services team has extensive experience with similar implementations. I've scheduled our enterprise architect to contact you for a detailed discussion of your organizational structure and reporting requirements so we can design the optimal configuration.",
      "I've arranged for our legal counsel specializing in healthcare compliance to contact you directly regarding sub-processor agreements. They'll provide: 1) Comprehensive documentation for all sub-processors who might process HIPAA-regulated data 2) Business Associate Agreements for relevant entities 3) Certification of HIPAA compliance training for personnel 4) Documentation of encryption and security controls at each processing stage. Our platform is designed with HIPAA compliance as a core requirement, and all our sub-processors handling healthcare data meet or exceed these standards. Our legal team will walk you through our complete compliance documentation package and address any specific concerns you might have about particular sub-processors.",
      "Our average time to patch critical vulnerabilities is 4 hours from confirmation to deployment across our entire infrastructure. For zero-day vulnerabilities, we implement immediate mitigation strategies while patches are being developed. Yes, we have a formal vulnerability disclosure policy that includes: 1) Our security response process with SLAs 2) Communication protocols for different severity levels 3) Coordination procedures with affected customers 4) Post-incident analysis and reporting. I've sent our complete vulnerability management policy document to your security team for review. We also participate in the responsible disclosure community and maintain a bug bounty program to proactively identify potential vulnerabilities before they can be exploited.",
      "Our platform is well-equipped to handle insurance industry actuarial calculations. For your jurisdiction-specific requirements, we recommend: 1) Creating a calculation template library with jurisdiction-specific variants 2) Implementing a rules engine that automatically applies the correct calculation methodology based on policy location 3) Developing a validation framework to ensure calculation accuracy across jurisdictions. We've worked with several major insurers to implement similar systems. Our financial services solution architect has experience with actuarial systems and can help design the optimal approach for your specific requirements. Would you like to arrange a workshop with our insurance industry specialist to map out your calculation requirements in detail?"
    ]
  }
];

// Additional specialized conversations for thorough testing
const complexConversations = [
  {
    category: "product",
    customerQueries: [
      "We need to migrate from a competitor's platform. Do you offer any migration tools or services?",
      "Your licensing model doesn't seem to fit our organizational structure. Can we discuss custom licensing?",
      "We've identified potential compliance issues with your cloud data processing. Can we discuss on-premises options?",
      "How does your platform perform with intermittent connectivity? Our teams work in remote locations.",
      "We need to implement digital signatures that comply with eIDAS regulation in Europe. Is this supported?",
      "Can we white-label your platform completely for our client portal? We need our own branding.",
      "How do you handle data schema evolution without breaking existing integrations?",
      "We need to support real-time collaboration with version control for regulatory documents. Is this possible?",
      "Your platform needs to integrate with our proprietary authentication system instead of using your built-in auth.",
      "We need to implement a complex approval matrix based on document type, amount, department, and geography."
    ],
    agentResponses: [
      "Yes, we offer comprehensive migration services from competitor platforms. Our approach includes automated data migration tools, custom field mapping, historical data preservation, and parallel running periods to ensure a smooth transition. We've successfully migrated customers from all major competitors in our space. Which platform are you currently using? I can provide specific information about our migration pathway from that system.",
      "We understand that standard licensing doesn't always fit complex organizational structures. For enterprise customers, we offer flexible licensing options including departmental licensing, usage-based models, user role-based pricing, and custom agreements for unique requirements. Our goal is to align our licensing with your organizational value. Could you share more details about your organization's structure and how our standard model doesn't fit your needs?",
      "We take compliance concerns very seriously. Yes, we offer a fully-featured on-premises deployment option for organizations with specific data sovereignty or compliance requirements. This gives you complete control over your data environment while still benefiting from our software capabilities. We also offer hybrid deployments where sensitive data remains on-premises while less sensitive functions use our cloud. Which specific compliance requirements are driving your interest in on-premises deployment?",
      "Our platform includes robust offline capabilities designed for intermittent connectivity environments. Features include local data caching, background synchronization when connectivity returns, conflict resolution protocols, and prioritized sync for critical data. Many of our customers operate in remote locations including mining operations, field services, and international development. What specific workflows do your remote teams need to accomplish during offline periods?",
      "Yes, our platform supports digital signatures compliant with eIDAS and other international electronic signature regulations. We offer multiple signature options including qualified electronic signatures through integration with Trust Service Providers, advanced electronic signatures with multi-factor authentication, and simple electronic signatures with comprehensive audit trails. Our European customers use these capabilities for contractual agreements, regulatory submissions, and formal approvals. Which specific eIDAS signature types do you need to implement?",
      "Absolutely, our Enterprise plan includes complete white-labeling capabilities. You can customize the platform with your branding including logo, color scheme, custom domain, email templates, notification content, and even custom CSS for pixel-perfect matching to your brand guidelines. The white-labeled experience is consistent across web, mobile, and generated documents. Many of our customers present our platform as their own client portal. Would you like to see examples of successful white-label implementations?",
      "Data schema evolution is handled through our versioned API architecture. When you need to modify data structures, we support backward compatibility through schema versioning, allowing existing integrations to continue functioning with the previous schema while new integrations can use the enhanced schema. For critical changes, we provide migration utilities, detailed documentation, and optional deprecation periods. This approach ensures business continuity during your application's natural evolution. What types of schema changes are you anticipating in your environment?",
      "Yes, our platform supports real-time collaborative editing with comprehensive version control specifically designed for regulatory documents. Features include real-time co-authoring with presence indicators, tracked changes with reviewer identification, version comparison tools, controlled release workflows, automated versioning based on document state changes, and complete audit trails for compliance purposes. This functionality is used extensively by our customers in pharmaceutical, financial services, and other regulated industries. Which specific regulatory framework governs your document collaboration needs?",
      "We support integration with proprietary authentication systems through several mechanisms: SAML 2.0 integration for enterprise identity providers, OAuth 2.0/OpenID Connect for modern authentication flows, custom authentication plugins for proprietary systems, and direct API access to our authorization layer. Many of our enterprise customers maintain their authentication infrastructure while leveraging our platform. Could you share more details about your proprietary authentication system so I can recommend the best integration approach?",
      "Our workflow engine supports exactly this type of complex conditional approval matrix. You can define approval paths based on multiple dimensions including document type, monetary amount thresholds, departmental hierarchies, geographical considerations, and any custom attributes you define. The system allows for parallel approvals, delegate management, escalation paths, and dynamic approver determination based on document content. We've implemented similar approval matrices for multinational enterprises with complex governance requirements. Would you like to see a demonstration of how this would work for your specific approval scenarios?"
    ],
    customerFollowups: [
      "We're currently using Acme CRM and have about 50GB of customer data and 10 years of historical records we need to preserve.",
      "We have a holding company structure with 12 separate legal entities, but we want centralized billing and flexible user assignment across entities.",
      "We're subject to GDPR, HIPAA, and financial regulations that require certain data to remain within our security perimeter.",
      "Our field teams need to collect survey data, access customer information, and create service tickets while offline for up to 3 days.",
      "We need qualified electronic signatures (QES) for legal contracts and advanced electronic signatures (AES) for internal approvals.",
      "Yes, we'd like to see examples. We specifically need to customize the login experience, dashboards, and all customer-facing elements.",
      "We anticipate adding industry-specific fields to customer records and creating new relationship types between entities.",
      "We're in pharmaceutical development, so we need CFR 21 Part 11 compliance for all document collaboration.",
      "We use a proprietary biometric authentication system developed in-house that generates encrypted tokens after successful authentication.",
      "We have a five-dimensional approval matrix with 20+ approval paths depending on document type, department, amount, risk level, and country."
    ],
    agentFollowups: [
      "Thank you for sharing details about your Acme CRM environment. We have extensive experience migrating from Acme CRM, including large historical datasets like yours. For your 50GB of customer data and 10-year history, we'll use our specialized Acme Connector that preserves all relationships, attachments, custom fields, and activity history. The migration process would include: 1) Initial data assessment and mapping workshop 2) Test migration to a sandbox environment 3) Validation and configuration adjustments 4) Incremental production migration to minimize disruption 5) Post-migration validation and optimization. This approach typically achieves 99.9%+ data fidelity while maintaining historical context and relationships. I've scheduled our migration specialist to contact you for a detailed assessment of your specific Acme implementation to develop a customized migration plan with timeline estimates.",
      "Your holding company structure with 12 legal entities is a scenario we've successfully addressed for similar enterprises. I recommend our Enterprise Group licensing model which provides: 1) Single master agreement and consolidated billing for the parent company 2) Flexible user assignment across all entities without additional licensing costs 3) Entity-specific administration and configuration while maintaining group-level oversight 4) Consolidated reporting across all entities with entity-specific filtering. This model includes a floating license pool that can be dynamically allocated across entities as your organizational needs evolve. I've asked our enterprise licensing specialist to prepare a custom proposal reflecting this structure, which you should receive by tomorrow. They can then schedule a call to refine the details to perfectly match your organizational requirements.",
      "For your compliance requirements spanning GDPR, HIPAA, and financial regulations, I recommend our Compliance+ deployment option. This provides: 1) On-premises deployment for sensitive regulated data with complete data sovereignty 2) Optional cloud connectivity for non-sensitive functions like reporting and collaboration 3) Data classification tools to ensure appropriate storage location based on sensitivity 4) Unified management across hybrid environments. This approach is used by several of our healthcare and financial services customers with similar regulatory requirements. Our compliance team can provide a detailed architecture diagram showing exactly how data flows are managed to maintain your security perimeter while still enabling business functionality. Would you like to schedule a compliance architecture review with our security team to map your specific regulatory requirements to our deployment options?",
      "For your field teams working offline for up to 3 days, our Extended Offline Mode is the perfect solution. It includes: 1) Complete local storage of assigned customer records with encryption 2) Full offline functionality for survey data collection with form validation 3) Service ticket creation and management including attachment handling 4) Intelligent synchronization that prioritizes critical data when connectivity is briefly available 5) Conflict resolution workflows for changes made to the same record both offline and online. This solution works across mobile devices and laptops with consistent functionality. We'll configure the offline data scope to ensure your field teams have all necessary information while maintaining reasonable device storage requirements. Would you like a demonstration of this offline capability with your specific workflows?",
      "We support both qualified electronic signatures (QES) and advanced electronic signatures (AES) in full compliance with eIDAS. For your needs, we recommend: 1) Integration with your preferred Trust Service Provider for QES on legal contracts, with options including DocuSign, Adobe Sign, and European providers like Connective and Intesi Group 2) Our built-in AES functionality for internal approvals, which includes multi-factor authentication, tamperer-evident seals, and comprehensive audit trails. Both methods include visual signature representations, cryptographic validation, and timestamp certification. Our implementation specialist can guide you through the configuration process for both signature types and help establish the appropriate workflows for different document categories. Would you like recommendations for TSP partners in your specific European markets?",
      "I'm sharing several examples of successful white-label implementations with you now via email. Based on your requirements for customizing login, dashboards, and customer-facing elements, I recommend our Premium White-Label package. This includes: 1) Custom CSS and design system integration to perfectly match your brand identity 2) Custom login flows and authentication screens 3) Fully brandable dashboards with your terminology and visual language 4) White-labeled notifications, emails, and generated documents 5) Custom URL structure to maintain your domain throughout the experience. The implementation process includes design workshops with our UI team to ensure perfect alignment with your brand guidelines. Many of our customers report that their clients never realize they're using a third-party platform. Would you like to schedule a design workshop to begin planning your white-label implementation?",
      "For your planned schema evolutions adding industry-specific fields and new relationship types, our Extended Data Model approach will provide the flexibility you need. This allows you to: 1) Add unlimited custom fields to standard objects without affecting core functionality 2) Create entirely new entity types specific to your industry 3) Establish complex relationship mappings between both standard and custom entities 4) Implement validation rules and business logic on your custom data model. All of these changes are automatically version-controlled through our schema registry, ensuring backward compatibility for existing integrations. When you're ready to implement these changes, our solution architect can help design the optimal data model extensions for your industry-specific requirements. Would you like to schedule a data modeling workshop to map out these enhancements?",
      "For pharmaceutical documentation under CFR 21 Part 11, we offer a validated collaboration environment that includes: 1) Electronic signature capabilities with biometric or multi-factor options 2) Complete audit trails of all document actions 3) Version control with secure archiving 4) Role-based access controls with signature authority management 5) System validation documentation to support your compliance efforts. Our platform is currently used by several pharmaceutical companies for regulated document collaboration. We also provide IQ/OQ/PQ validation protocol templates specific to CFR 21 Part 11 requirements to streamline your validation process. Our life sciences compliance specialist would be happy to review your specific procedures and ensure our implementation aligns with your internal policies. Would you like to schedule this compliance alignment session?",
      "Your proprietary biometric authentication system with encrypted tokens can integrate with our platform through our Authentication Provider Interface. Here's how we'll implement it: 1) Create a custom authentication connector using our secure API 2) Establish a token validation protocol between your system and ours 3) Implement session management that honors your token lifecycle and security parameters 4) Set up user provisioning from your identity source. We've integrated with several proprietary authentication systems, including other biometric solutions. Our security architect will work with your team to understand the specific token format and encryption methods your system uses to ensure a seamless and secure integration. Would you like to arrange a technical discovery session between our security team and your authentication system developers?",
      "Your five-dimensional approval matrix is exactly the kind of complex approval scenario our Dynamic Workflow Engine was designed to handle. For your 20+ approval paths based on document type, department, amount, risk level, and country, we'll implement: 1) A conditional rule builder that evaluates all five dimensions to determine the appropriate approval path 2) Dynamic approver determination that can pull authorized signatories from your organizational structure 3) Parallel and sequential approval chains with conditional branching 4) Delegation and escalation mechanics with appropriate time thresholds 5) Comprehensive tracking and reporting of approval metrics. We've implemented similarly complex approval systems for multinational financial institutions and government agencies. I've assigned our senior workflow architect to create a prototype approval matrix based on your dimensions. Would you like to schedule a workflow mapping session to document the specific approval rules for each of your scenarios?"
    ]
  }
];

// Generate a conversation from templates
const generateConversation = (index: number): Conversation => {
  // Combine all conversation templates
  const allConversations = [
    ...productConversations,
    ...billingConversations,
    ...technicalConversations,
    ...accountConversations,
    ...advancedConversations,
    ...specializedConversations,
    ...complexConversations
  ];
  
  const randomTemplate = allConversations[Math.floor(Math.random() * allConversations.length)];
  const randomQueryIndex = Math.floor(Math.random() * randomTemplate.customerQueries.length);
  
  const timestamp = getRandomDate();
  const date = new Date(timestamp);
  
  // Create random time differences between messages
  const randomMinutesDiff1 = Math.floor(Math.random() * 5) + 1;
  const randomMinutesDiff2 = Math.floor(Math.random() * 10) + 5;
  const randomMinutesDiff3 = Math.floor(Math.random() * 5) + 2;
  const randomMinutesDiff4 = Math.floor(Math.random() * 10) + 3;
  
  const messageTimestamp1 = new Date(date.getTime());
  const messageTimestamp2 = new Date(date.getTime() + randomMinutesDiff1 * 60 * 1000);
  
  // Create more varied message patterns
  const includeFollowup = Math.random() > 0.3; // 70% chance of including followup
  
  const customerNames = [
    "Raj Sharma", "Priya Patel", "Amit Kumar", "Sneha Gupta", 
    "Vikram Singh", "Neha Verma", "Sanjay Desai", "Ananya Reddy", 
    "Rahul Mehta", "Pooja Agarwal", "Kiran Joshi", "Deepak Nair",
    "Meera Iyer", "Suresh Menon", "Kavita Singh", "Arun Reddy",
    "Nandini Kumar", "Vijay Shah", "Shikha Gupta", "Prakash Jain",
    "John Smith", "Emma Wilson", "Michael Brown", "Sophia Garcia",
    "William Johnson", "Olivia Martinez", "James Taylor", "Isabella Anderson",
    "Benjamin Thomas", "Mia Rodriguez", "Ethan White", "Charlotte Lewis",
    "Alexander Hall", "Amelia Clark", "Daniel Young", "Harper King",
    "Matthew Wright", "Abigail Scott", "Joseph Green", "Emily Baker",
    "David Adams", "Elizabeth Hill", "Andrew Carter", "Sofia Mitchell",
    "Joshua Nelson", "Avery Turner", "Christopher Phillips", "Ella Parker"
  ];
  
  const agentNames = [
    "Arjun Krishnan", "Divya Sharma", "Rajesh Patel", "Meena Iyer", 
    "Suresh Kumar", "Anjali Singh", "Ravi Menon", "Kavita Gupta", 
    "Prakash Reddy", "Sunita Verma", "Vijay Nair", "Neha Kapoor",
    "Karthik Rajan", "Lakshmi Narayanan", "Anand Mahadevan", "Priyanka Das",
    "Mohan Rao", "Sarika Patil", "Deepa Menon", "Ganesh Swamy",
    "Sarah Johnson", "Robert Williams", "Jennifer Davis", "Mark Miller",
    "Lisa Wilson", "Richard Moore", "Patricia Taylor", "Thomas Anderson",
    "Margaret Thompson", "Charles Jackson", "Linda Martinez", "Daniel White",
    "Barbara Jones", "Joseph Martin", "Elizabeth Lee", "Paul Harris",
    "Susan Clark", "Andrew Robinson", "Jessica Lewis", "Kevin Allen",
    "Dorothy Walker", "Brian Young", "Karen Scott", "Edward King",
    "Nancy Green", "Steven Baker", "Karen Hill", "George Wright"
  ];
  
  const messages: Message[] = [
    {
      id: `msg-${index}-1`,
      sender: "customer",
      text: randomTemplate.customerQueries[randomQueryIndex],
      timestamp: messageTimestamp1.toISOString(),
    },
    {
      id: `msg-${index}-2`,
      sender: "agent",
      text: randomTemplate.agentResponses[randomQueryIndex],
      timestamp: messageTimestamp2.toISOString(),
    }
  ];
  
  // Add followup messages if needed
  if (includeFollowup && randomTemplate.customerFollowups && randomTemplate.agentFollowups) {
    const messageTimestamp3 = new Date(date.getTime() + (randomMinutesDiff1 + randomMinutesDiff2) * 60 * 1000);
    const messageTimestamp4 = new Date(date.getTime() + (randomMinutesDiff1 + randomMinutesDiff2 + randomMinutesDiff3) * 60 * 1000);
    
    messages.push({
      id: `msg-${index}-3`,
      sender: "customer",
      text: randomTemplate.customerFollowups[randomQueryIndex],
      timestamp: messageTimestamp3.toISOString(),
    });
    
    messages.push({
      id: `msg-${index}-4`,
      sender: "agent",
      text: randomTemplate.agentFollowups[randomQueryIndex],
      timestamp: messageTimestamp4.toISOString(),
    });
    
    // Add a thank you message in some cases
    if (Math.random() > 0.6) {
      const messageTimestamp5 = new Date(date.getTime() + (randomMinutesDiff1 + randomMinutesDiff2 + randomMinutesDiff3 + randomMinutesDiff4) * 60 * 1000);
      const thankYouMessages = [
        "Thank you so much for your help!",
        "That solved my issue, thanks.",
        "Perfect, thanks for the assistance.",
        "I appreciate your help. This is exactly what I needed.",
        "Great, that works for me. Thank you!",
        "Thanks for explaining that clearly.",
        "That's very helpful. Thank you for your time.",
        "You've been extremely helpful. Thank you.",
        "Thanks for going above and beyond to solve this.",
        "I really appreciate your expertise and help.",
        "Thank you for your patience in explaining this to me.",
        "This is exactly the information I was looking for. Thank you!",
        "You've made this much easier than I expected. Thanks!",
        "I'm very satisfied with this solution. Thank you.",
        "Your help has been invaluable. Many thanks!"
      ];
      
      messages.push({
        id: `msg-${index}-5`,
        sender: "customer",
        text: thankYouMessages[Math.floor(Math.random() * thankYouMessages.length)],
        timestamp: messageTimestamp5.toISOString(),
      });
    }
  } else {
    // Add a simple thank you as the third message if no followups
    const messageTimestamp3 = new Date(date.getTime() + (randomMinutesDiff1 + randomMinutesDiff2) * 60 * 1000);
    const simpleThankYouMessages = [
      "Thank you for your assistance. I'll try that.",
      "Thanks, that solves my issue.",
      "I'll follow these steps. Thank you.",
      "Got it, thanks for your help.",
      "I appreciate the quick response. Thanks!",
      "That makes sense. Thank you.",
      "Thanks for clarifying. I understand now.",
      "Thank you for the information.",
      "I'll implement your suggestion. Thanks!",
      "Clear explanation, thank you.",
      "Perfect, I'll proceed with this. Thanks!",
      "That's helpful, thank you.",
      "I understand now. Thanks for explaining.",
      "Thanks for pointing me in the right direction.",
      "Just what I needed to know. Thanks!"
    ];
    
    messages.push({
      id: `msg-${index}-3`,
      sender: "customer",
      text: simpleThankYouMessages[Math.floor(Math.random() * simpleThankYouMessages.length)],
      timestamp: messageTimestamp3.toISOString(),
    });
  }
  
  const conversation: Conversation = {
    id: `conv-${index + 1}`,
    customerId: `cust-${Math.floor(Math.random() * 10000) + 1}`,
    customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
    timestamp,
    duration: getRandomDuration(),
    agentId: `agent-${Math.floor(Math.random() * 100) + 1}`,
    agentName: agentNames[Math.floor(Math.random() * agentNames.length)],
    category: randomTemplate.category,
    resolved: Math.random() > 0.2, // 80% chance of being resolved
    satisfactionScore: getRandomSatisfactionScore(),
    sentiment: getRandomSentiment(),
    messages: messages,
    tags: getRandomTags(),
  };
  
  return conversation;
};

// Generate 200 mock conversations for comprehensive testing
export const mockConversations: Conversation[] = Array.from({ length: 200 }, (_, index) => generateConversation(index));

// Additional mock data for other entities in the system could be added here
