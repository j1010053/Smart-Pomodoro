export default {
  async fetch(request, env) {
    if (env.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response("Smart Pomodoro assets are unavailable.", { status: 503 });
  },
};
