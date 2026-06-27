import { Linking, Pressable, Text, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { toTelHref } from "@/features/calls/labels";

type PhoneDialLinkProps = {
  phone: string | null | undefined;
  children: ReactNode;
};

export function PhoneDialLink({ phone, children }: PhoneDialLinkProps) {
  const href = toTelHref(phone);

  if (!href) {
    return <Text style={styles.plain}>{children}</Text>;
  }

  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        void Linking.openURL(href);
      }}
      accessibilityRole="link"
      accessibilityLabel={`Call ${phone}`}
      hitSlop={8}
      style={styles.hit}
    >
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: 44, justifyContent: "center" },
  link: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  plain: { fontSize: 14, color: "#52525b" },
});
