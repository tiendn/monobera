export const formatInputTokenValue = (inputValue: string) => {
  if (inputValue === null || inputValue === undefined || inputValue === "") {
    return "0";
  }

  // Convert number to string
  const inputStr = typeof inputValue === "number" ? Number(inputValue).toString() : inputValue;

  if (inputStr === "0") return inputStr;
  
  // Remove all non-numeric characters except for the decimal point, and remove leading zeros
  let filteredValue = inputStr.replace(/^0+/, "").replaceAll(/[^0-9.]/g, "");

  // Keep the 0
  if (filteredValue.startsWith(".")) {
    filteredValue = `0${filteredValue}`;
  }

  return filteredValue;
};
