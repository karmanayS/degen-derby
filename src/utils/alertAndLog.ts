import Toast from "react-native-toast-message";

export function alertAndLog(title: string, message: any) {
  const msg = typeof message === "string" ? message : String(message);
  Toast.show({ type: "error", text1: title, text2: msg });
  console.log(message);
}
