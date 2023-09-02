import otpGenerator from "otp-generator";

export const generateOTP = () => {
  const OTP = otpGenerator.generate(process.env.OTP_LENGTH, {
    upperCaseAlphabets: process.env.OTP_CONFIG_UPPERCASE_ALPHABETS,
    OTP_CONFIG_SPECIAL_CHARS: process.env.OTP_CONFIG_SPECIAL_CHARS,
  });
  return OTP;
};

export const generateReferenceCode = () => {
  const ReferenceCode = otpGenerator.generate(process.env.REFERENCE_CODE_LENGTH, {
    upperCaseAlphabets: process.env.OTP_CONFIG_UPPERCASE_ALPHABETS,
    OTP_CONFIG_SPECIAL_CHARS: process.env.OTP_CONFIG_SPECIAL_CHARS,
  });
  return ReferenceCode;
};