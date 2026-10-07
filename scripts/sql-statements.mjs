// Preserve dollar-quoted function bodies while splitting our migration files.
export function sqlStatements(source) {
  const bodies = [];
  return source
    .replace(/\$([a-zA-Z_][a-zA-Z_0-9]*|)\$[\s\S]*?\$\1\$/g, (body) => {
      bodies.push(body);
      return `__SQL_BODY_${bodies.length - 1}__`;
    })
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((statement) =>
      statement
        .replace(/__SQL_BODY_(\d+)__/g, (_, index) => bodies[Number(index)])
        .trim(),
    )
    .filter(Boolean);
}
