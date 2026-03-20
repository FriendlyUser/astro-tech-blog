// Simplified for clarity, focusing on the fix
const ContactMe = () => (
  <form
    className="max-w-lg"
    action="https://formspree.io/f/xpqybvwy"
    method="POST"
  >
    <div className="-mx-3 mb-6 flex flex-wrap">
      <div className="mb-6 w-full px-3 md:mb-0 md:w-1/2">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide" htmlFor="grid-first-name">
          First Name
        </label>
        <input
          name="firstName" // Added this
          className="mb-3 block w-full appearance-none rounded py-3 px-4 leading-tight text-gray-700 focus:bg-white focus:outline-none"
          id="grid-first-name"
          type="text"
          placeholder="Jane"
          required
        />
      </div>
      <div className="w-full px-3 md:w-1/2">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide" htmlFor="grid-last-name">
          Last Name
        </label>
        <input
          name="lastName" // Added this
          className="block w-full appearance-none rounded border border-gray-200 py-3 px-4 leading-tight text-gray-700 focus:border-gray-500 focus:bg-white focus:outline-none"
          id="grid-last-name"
          type="text"
          placeholder="Doe"
          required
        />
      </div>
    </div>

    <div className="-mx-3 mb-6 flex flex-wrap">
      <div className="w-full px-3">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide" htmlFor="email">
          E-mail
        </label>
        <input
          name="email" // Added this
          className="mb-3 block w-full appearance-none rounded border py-3 px-4 leading-tight text-gray-700 focus:border-gray-500 focus:bg-white focus:outline-none"
          id="email"
          type="email"
          required
        />
      </div>
    </div>

    <div className="-mx-3 mb-6 flex flex-wrap">
      <div className="w-full px-3">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide" htmlFor="message">
          Message
        </label>
        <textarea
          name="message" // Added this
          className="no-resize mb-3 block h-48 w-full resize-none appearance-none rounded border border-gray-200 py-3 px-4 leading-tight text-gray-700 focus:border-gray-500 focus:bg-white focus:outline-none"
          id="message"
          required
        />
      </div>
    </div>

    <div className="md:flex md:items-center">
      <div className="md:w-1/3">
        <button
          className="ml-2 shrink-0 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 px-6 py-2 text-sm font-medium text-white hover:from-sky-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/50"
          type="submit"
        >
          Send
        </button>
      </div>
    </div>
  </form>
);

export { ContactMe };