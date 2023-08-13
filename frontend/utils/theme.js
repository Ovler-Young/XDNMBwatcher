import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  config: {
    initialColorMode:"system",
    useSystemColorMode: true,
  },
  fonts: {
    heading: "noto-sans-sc",
    body: "noto-sans-sc",
  },
  shadows: {
    outline: "0 0 0 2px gray",
  },
});

export default theme;
