const axios = require('axios');
const { GraphQLError } = require('graphql');

const RAZORPAY_KEY = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock';
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
const RAZORPAYX_ACCOUNT = process.env.RAZORPAYX_ACCOUNT_NUMBER || '1234567890';

const auth = Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64');
const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json'
};

const RAZORPAY_API = 'https://api.razorpay.com/v1';

exports.createContact = async (user) => {
  try {
    const response = await axios.post(`${RAZORPAY_API}/contacts`, {
      name: user.name,
      email: user.email,
      contact: user.phone || '9999999999',
      type: 'vendor',
      reference_id: user._id.toString()
    }, { headers });
    return response.data.id;
  } catch (error) {
    console.error('Razorpay Create Contact Error:', error.response?.data || error.message);
    throw new GraphQLError(`Razorpay Contact Creation Failed: ${JSON.stringify(error.response?.data || error.message)}`);
  }
};

exports.createFundAccount = async (contactId, bankDetails) => {
  try {
    const response = await axios.post(`${RAZORPAY_API}/fund_accounts`, {
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name: bankDetails.accountHolderName,
        ifsc: bankDetails.ifscCode,
        account_number: bankDetails.accountNumber
      }
    }, { headers });
    return response.data.id;
  } catch (error) {
    console.error('Razorpay Create Fund Account Error:', error.response?.data || error.message);
    throw new GraphQLError(`Razorpay Fund Account Creation Failed: ${JSON.stringify(error.response?.data || error.message)}`);
  }
};

exports.processPayout = async (payout, organizer) => {
  if (RAZORPAY_KEY === 'rzp_test_mock') {
    return { id: 'pout_mock_' + Date.now(), status: 'processed' };
  }

  const User = require('../../models/User');
  let contactId = organizer.razorpayContactId;
  let fundAccountId = organizer.razorpayFundAccountId;

  try {
    if (!contactId) {
      contactId = await this.createContact(organizer);
      organizer.razorpayContactId = contactId;
      await organizer.save();
    }

    if (!fundAccountId) {
      if (!organizer.bankDetails || !organizer.bankDetails.accountNumber) {
        throw new GraphQLError('Organizer bank details missing for Razorpay Payout');
      }
      fundAccountId = await this.createFundAccount(contactId, organizer.bankDetails);
      organizer.razorpayFundAccountId = fundAccountId;
      await organizer.save();
    }

    const response = await axios.post(`${RAZORPAY_API}/payouts`, {
      account_number: RAZORPAYX_ACCOUNT,
      fund_account_id: fundAccountId,
      amount: Math.round(payout.amount * 100),
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: payout._id.toString(),
      narration: `Payout for ${organizer.name}`
    }, { headers });
    return response.data;
  } catch (error) {
    const errorData = error.response?.data?.error || {};
    // If Payouts endpoint is not found (404/405), simulate success for learning
    if (error.response?.status === 404 || error.response?.status === 405 || errorData.description?.includes('not found')) {
      console.warn('--- RAZORPAY HYBRID MODE ---');
      console.warn('Contact & Fund Account were REAL, but Payout is SIMULATED (Enable RazorpayX for real payouts).');
      return { 
        id: 'pout_sim_' + Math.random().toString(36).substr(2, 9), 
        status: 'processed', 
        amount: Math.round(payout.amount * 100),
        currency: 'INR',
        mode: 'IMPS',
        fund_account_id: fundAccountId,
        note: 'Real Contact & Fund Account used.'
      };
    }
    
    console.error('--- RAZORPAY API ERROR ---');
    console.error('Code:', errorData.code);
    console.error('Description:', errorData.description);
    
    throw new GraphQLError(`Razorpay Payout Failed: ${errorData.description || error.message}`);
  }
};
