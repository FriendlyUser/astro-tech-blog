// TODO add react state for the contact form
const ContactMe = () => (
  <form
    className="max-w-lg"
    action="https://formspree.io/f/davidli012345@gmail.com"
    method="POST"
  >
    <div className="-mx-3 mb-6 flex flex-wrap">
      <div className="mb-6 w-full px-3 md:mb-0 md:w-1/2">
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-wide"
          htmlFor="grid-first-name"
        >
          First Name
        </label>
        <input
          className="mb-3 block w-full appearance-none rounded py-3 px-4 leading-tight text-gray-700 focus:bg-white focus:outline-none"
          id="grid-first-name"
          type="text"
          placeholder="Jane"
        />
      </div>
      <div className="w-full px-3 md:w-1/2">
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-wide"
          htmlFor="grid-last-name"
        >
          Last Name
        </label>
        <input
          className="block w-full appearance-none rounded border border-gray-200  py-3 px-4 leading-tight text-gray-700 focus:border-gray-500 focus:bg-white focus:outline-none"
          id="grid-last-name"
          type="text"
          placeholder="Doe"
        />
      </div>
    </div>
    <div className="-mx-3 mb-6 flex flex-wrap">
      <div className="w-full px-3">
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-wide"
          htmlFor="grid-password"
        >
          E-mail
        </label>
        <input
          className="mb-3 block w-full appearance-none rounded border py-3 px-4 leading-tight  focus:border-gray-500 focus:bg-white focus:outline-none"
          id="email"
          type="email"
        />
      </div>
    </div>
    <div className="-mx-3 mb-6 flex flex-wrap">
      <div className="w-full px-3">
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-wide"
          htmlFor="grid-password"
        >
          Message
        </label>
        <textarea
          className="no-resize mb-3 block h-48 w-full resize-none appearance-none rounded border border-gray-200 py-3 px-4 leading-tight focus:border-gray-500 focus:bg-white focus:outline-none"
          id="message"
        />
      </div>
    </div>
    <div className="md:flex md:items-center">
      <div className="md:w-1/3">
        <button
          className="ml-2 shrink-0 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 px-3 py-1 text-sm font-medium hover:from-sky-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/50"
          type="submit"
        >
          Send
        </button>
      </div>
      <div className="md:w-2/3"></div>
    </div>
  </form>
);

export { ContactMe };
