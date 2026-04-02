async function test() {
    let res = await fetch('https://api.counterapi.dev/v1/lfah-access-global-event-2026/session_id');
    console.log("Status:", res.status, res.ok);
}
test();
