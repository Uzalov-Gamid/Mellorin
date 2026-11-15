import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Card, Chip, Collapsible, Dots, NightCard, Pill, Quote, Ring, Segments, StepPills, Table } from "./index";

describe("shared presentation components", () => {
  it.each([
    ["Pill", <Pill>learning</Pill>, "learning"],
    ["Chip", <Chip>English</Chip>, "English"],
    ["Card", <Card variant="paper">Article</Card>, "ui-card-paper"],
    ["NightCard", <NightCard>Code</NightCard>, "ui-night"],
    ["Button", <Button disabled>Apply</Button>, 'disabled=""'],
    ["Ring", <Ring label="Subject" value={200}>100</Ring>, 'aria-valuenow="100"'],
    ["Dots", <Dots label="Answers" states={["done", "error"]} />, 'aria-label="2: error"'],
    ["Segments", <Segments label="Reading" states={["done", "current", "pending"]} />, "ui-current"],
    ["StepPills", <StepPills steps={[{ label: "Read", state: "current" }]} />, 'aria-current="step"'],
    ["Table", <Table headers={["Word"]} rows={[["bank"]]} caption="Words" />, '<th scope="col">Word</th>'],
    ["Quote", <Quote>Remember</Quote>, "blockquote"],
    ["Collapsible", <Collapsible>Answer</Collapsible>, "<summary>показать ответ</summary>"],
  ])("renders %s with its semantic content", (_name, component, expected) => {
    expect(renderToStaticMarkup(component)).toContain(expected);
  });
  it("handles unavailable and negative ring totals without invalid CSS", () => {
    expect(renderToStaticMarkup(<Ring label="Empty" value={3} total={0} />)).toContain('aria-valuenow="0"');
    expect(renderToStaticMarkup(<Ring label="Empty" value={-3} />)).toContain('aria-valuenow="0"');
  });
});
