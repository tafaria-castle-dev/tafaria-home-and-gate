import { Text, StyleSheet } from "@react-pdf/renderer";
import { Font } from "@react-pdf/renderer";

interface TruncatedTextProps {
  text: string;
  maxLength: number;
}

const hyphenationCallback = (word: string) => {
  if (word === "email@example.com") {
    return [word];
  }
  return word.split("-");
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: "bold",
  },
  normal: {
    fontWeight: "normal",
  },
});

const TruncatedText: React.FC<TruncatedTextProps> = ({ text, maxLength }) => {
  Font.registerHyphenationCallback(hyphenationCallback);

  const truncated =
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  const lines = truncated.split("\n");

  return (
    <Text>
      {lines.map((line, index) => {
        const colonIndex = line.indexOf(":");
        const lineKey = `line-${index}`;

        if (colonIndex !== -1) {
          const beforeColon = line.substring(0, colonIndex + 1);
          const afterColon = line.substring(colonIndex + 1);
          return (
            <Text key={lineKey}>
              <Text style={styles.bold}>{beforeColon}</Text>
              <Text style={styles.normal}>{afterColon}</Text>
              {index < lines.length - 1 && "\n"}
            </Text>
          );
        }

        return (
          <Text key={lineKey}>
            {line}
            {index < lines.length - 1 && "\n"}
          </Text>
        );
      })}
    </Text>
  );
};

export default TruncatedText;
