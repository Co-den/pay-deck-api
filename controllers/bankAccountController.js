const Merchant = require("../models/MerchantModel");

exports.verifyBankAccount = async (req, res) => {
  try {
    const { accountNumber, routingNumber } = req.body;

    // TODO: Integrate with real bank verification service (Plaid, Stripe, etc.)
    // This is a mock verification

    // Simulate API call to bank verification service
    const mockAccountName = await verifyBankAccount(
      accountNumber,
      routingNumber
    );

    res.json({
      success: true,
      accountName: mockAccountName,
      verified: true,
    });
  } catch (error) {
    console.error("Verify bank account error:", error);
    res.status(500).json({ error: "Could not verify bank account" });
  }
};

exports.getBankAccount = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Mask account number
    const bankAccount = merchant.bankAccount
      ? {
          ...merchant.bankAccount.toObject(),
          accountNumber: maskAccountNumber(merchant.bankAccount.accountNumber),
        }
      : null;

    res.json({
      success: true,
      bankAccount,
    });
  } catch (error) {
    console.error("Get bank account error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateBankAccount = async (req, res) => {
  try {
    const {
      bankName,
      accountName,
      accountNumber,
      routingNumber,
      accountType,
      payoutSchedule,
    } = req.body;

    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Verify account before saving
    const isVerified = await verifyBankAccount(accountNumber, routingNumber);

    user.bankAccount = {
      bankName,
      accountName,
      accountNumber,
      routingNumber,
      accountType,
      payoutSchedule,
      isVerified: !!isVerified,
    };

    await user.save();

    res.json({
      success: true,
      message: "Bank account updated successfully",
      bankAccount: {
        ...merchant.bankAccount.toObject(),
        accountNumber: maskAccountNumber(merchant.bankAccount.accountNumber),
      },
    });
  } catch (error) {
    console.error("Update bank account error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
