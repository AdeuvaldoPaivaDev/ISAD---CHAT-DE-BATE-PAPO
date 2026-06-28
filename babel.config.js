module.exports = (api) => {
  api.cache(true)
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // O plugin de worklets do Reanimated 4 precisa ser o ÚLTIMO da lista.
    // (No SDK 54 ele passou a se chamar "react-native-worklets/plugin";
    // o antigo "react-native-reanimated/plugin" hoje é só um re-export deste.)
    plugins: ["react-native-worklets/plugin"],
  }
}
