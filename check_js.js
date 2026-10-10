var app = Application.currentApplication();
app.includeStandardAdditions = true;
var content = app.read(Path("/Users/trung/trungplay/app.js"));
try {
  eval(content);
  console.log("OK");
} catch(e) {
  console.log(e.toString());
}
