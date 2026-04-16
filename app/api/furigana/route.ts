import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import kuromoji from "kuromoji";

type KuromojiToken = {
  surface_form: string;
  reading?: string;
};

let tokenizerPromise: Promise<kuromoji.Tokenizer<KuromojiToken>> | null = null;

function katakanaToHiragana(value: string): string {
  return value.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function getTokenizer(): Promise<kuromoji.Tokenizer<KuromojiToken>> {
  if (tokenizerPromise) return tokenizerPromise;
  tokenizerPromise = new Promise((resolve, reject) => {
    kuromoji
      .builder({
        dicPath: path.join(process.cwd(), "node_modules/kuromoji/dict"),
      })
      .build((err, tokenizer) => {
        if (err || !tokenizer) {
          reject(err ?? new Error("Tokenizer initialization failed"));
          return;
        }
        resolve(tokenizer as kuromoji.Tokenizer<KuromojiToken>);
      });
  });
  return tokenizerPromise;
}

export async function GET(request: NextRequest) {
  const text = new URL(request.url).searchParams.get("text") ?? "";
  const source = text.trim();
  if (source === "") {
    return NextResponse.json({ hiragana: "" });
  }

  try {
    const tokenizer = await getTokenizer();
    const tokens = tokenizer.tokenize(source);
    const hiragana = tokens
      .map((token) => {
        if (token.reading && token.reading.trim() !== "") {
          return katakanaToHiragana(token.reading);
        }
        return katakanaToHiragana(token.surface_form ?? "");
      })
      .join("")
      .replace(/\s+/g, "");
    return NextResponse.json({ hiragana });
  } catch (e) {
    console.error("Failed to generate furigana", e);
    return NextResponse.json({ error: "failed to generate furigana" }, { status: 500 });
  }
}
