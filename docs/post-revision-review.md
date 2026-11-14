# 2023–2025 post revision: items for the author to review

All 509 posts dated 2023–2025 were revised to `docs/post-revision-guide.md` on 2026-11-14.
Filenames, URLs and `pubDate` are unchanged; every post got `lastUpdated: 2026-11-14`.
The items below were judgement calls or problems the revision could not fix on its own.
Delete this file once you've been through it.

## Statements about you or how a post was made

- `random/pikachu_bobble_head.md`: an affiliate disclosure was **added** (links go through AliExpress Portals). Confirm or remove.
- `tech/net/intro_to_mudblazor.md`: a "generated with AI using Bing" line was **removed** (with Bing citation leftovers). Restore if you want the disclosure.
- `tech/python/getting_started_with_tortoise_tts.md`: a "generated with Bing GPT" note was **removed**. Same question.
- `tech/2025/ai_training_platforms.md`: referral link and QR code have no referral disclosure (none added). Pay/responsiveness claims are anecdotal.
- `tech/2024/mermaid_diagram_creation.md`: herokuapp affiliate link and its disclosure kept; a "Mermaid Live Editor" link actually goes to mermaidchart.com with UTM tags (relabelled, not changed).

## Opinion posts with added context

- `stonks/thoughts/why_I_am_buying_sqqq.md`: thesis kept, but a hindsight note (SQQQ fell ~74% in 2023) and a leveraged-ETF decay example were added.
- `stonks/thoughts/credit_suisse_failings.md`: added an update note on the UBS takeover.
- `stonks/ta/natural_gas_ta_with_python.md`: Birchcliff debt figure corrected (176M → 138.5M), 2024/25 dividend-cut update added, unverifiable "50M debt target" dropped.

## Posts about libraries that don't exist

Each now has a `:::caution` aside and is rewritten around the real equivalent. Consider unpublishing instead.

- `tech/go/Utilizing_Micha_in_Golang_An_Efficient_Web_Socket_Client.md` (micha → sacOO7/gowebsocket)
- `tech/go/Using_Message_Passing_InterfaceA_Guide_to_MPB.md` (go-mpb → gompi)
- `tech/go/Using_Task_in_GoLang_A_Comprehensive_Guide.md` (fake Task package → WaitGroup/errgroup)
- `tech/go/Using_Gaper_A_Powerful_Process_Supervisor.md` (wrong repo/API → maxcnunes/gaper)
- `tech/go/getting_started_with_go_audio.md` (goaudio/goaudio → go-audio/wav)
- `tech/rust/Using_OpenGMK_in_Rust_A_Comprehensive_Guide.md` (whole post invented → real OpenGMK project)
- `tech/rust/Using_Generator_Functions_(genfuncs)_in_Rust.md` (no such crate → iter::from_fn / async-stream)
- `tech/rust/Using_Yaydl_in_Rust_A_Guide_to_Video_Downloading.md` (invented library API → CLI via `Command`)
- `tech/kotlin/Introduction_to_KAndroid_Streamlining_Android_Development_in_Kotlin.md` (404 repo link → pawegio/KAndroid)
- `tech/deno/Using_Astrodon_in_Deno_A_Comprehensive_Guide.md`, `tech/deno/Using_Fresh_in_Deno_for_Web_Development.md`, `tech/deno/Leveraging_Autopilot_in_Deno_A_Step-by-Step_Guide.md`: all showed invented APIs; rewritten (Autopilot repo link → littledivy/autopilot-deno).

## Content removed or heavily cut

- Unrelated articles that had been pasted into a post were removed from: Jetty (Apache Beam), Fabric (Pascal history), PySerial (Pascal/Lazarus), react_native_maps (cosmology "supercluster"), Pogo (POCO C++), web_scrapping_in_csharp (LINQ), reflections_in_kotlin, set_and_map_in_java, diagrams_in_tex (Git tutorial).
- Leftover LLM chat replies/prompts ("Sure, here's…", "As an AI language model…", "Write a technical article…") removed from dozens of posts, notably the `tech/go/chapter_*`, `tech/python/chap_*` and `tech/net/csharp_introduction.md` series.
- `tech/python/personal_finance.md`: ~14k words of repeated tip lists condensed to one US checklist.
- `tech/go/Using_Viper_in_Golang_for_Configuration_Management.md`: original was truncated mid-post; most of the body is new.
- Several chapter posts (`tech/go/chapter_*`, `tech/python/chap_*`) had copied another chapter's title; retitled to match their content.

## Dead services, links and your own projects

- `iplist.cc` is now a parked domain: `tech/net/minimum_api_ip_address.md`, `tech/php/laravel_how_to_make_api.md` (cautions added). `tech/scripting/github_action_to_detect_ip_address.md` now uses ipinfo.io, but your published action v1.0.0 still calls iplist.cc.
- Tronald Dump API is gone: `tech/2023/drogon_with_trump_api.md`, `tech/go/basic_wails_app.md` (cautions added).
- Your repos/links returning 404 (kept): `github.com/FriendlyUser/dart_fns/functions`, `github.com/FriendlyUser/chatgpt_blog_generator`, ELEC370 `pdfToPNGMagick.py`.
- Your Hugging Face Spaces show errors: `stonks/gradio_ui_for_nlp_stonks.md` (runtime error), `tech/flutter/how_to_deploy_dart_to_hs.md` (BUILD_ERROR).
- `stonks/getting_started_with_cad_tickers.md`: the CSE export URL used by cad_tickers now 404s; the library needs Python ≤3.11.
- Link targets changed: `stonks/web/scrap_from_sec_with_python.md` (13F repo link → FriendlyUser; an email address was also removed from the code), `tech/2024/how_to_setup_localai.md` (parked localai.space removed; nlux.dev → docs.nlkit.com/nlux), `tech/js/react_native_maps.md` (clustering credit → tomekvenits repo), `tech/rust/Using_Rustfmt_to_Format_Rust_Code.md` (deprecated VS Code/IntelliJ extension links → rust-analyzer/RustRover).
- Code in these posts now differs from the linked repo: `flipp_grocery_scrapper.md` (describes the current repo, not 2023), `tech/net/news_app_csharp.md`, `tech/flutter/flutter_todo_list_with_supabase.md`, `tech/js/building_a_price_card_component_in_react.md` and `tech/js/car_animation.md` (CodeSandbox embeds still show the old code).
- `tech/scripting/creating_my_own_subs.md` relies on ktkkt.top, which looks like an unlicensed streaming site.
- `tech/scripting/uploading_apks_to_google_drive_in_bitrise.md` and `tech/go/moving_files_with_script_in_go.md` contain a real Drive folder ID and your AdSense publisher ID respectively (kept). `tech/scripting/switch_from_circleci_to_githubactions.md` and `tech/dapps/tracking_files_with_a_smart_contract.md` contain your email (kept).
- The `tech/go/chapter_*` series and `tech/seven_chatgpt_prompts.md` link to `FriendlyUser/bluey-wordpress-theme`, which is unrelated; `tech/python/python_introduction.md` links to `FriendlyUser/bookapi`, also unrelated.

## Worth spot-checking

Agents confirmed these against registries, but they look unusual:

- `tech/2024/gpt_integration_in_excel.md`: model name `gpt-6-luna`; `tech/python/chatgpt_blog_generation.md`: `gpt-5.5`.
- `tech/2023/Understanding_Hibernate_ORM_A_Comprehensive_Guide.md`: `mysql-connector-j` 26.10.0.
- `tech/rust/Using_the_`cc`_Crate_in_Rust_for_C_Interoperability.md`: cc 1.11.2.

Most non-Python/Deno code was checked against docs rather than compiled (no Go, Rust, Swift, Java, Dart, C++ or TeX toolchain on the machine).

## Tags that don't fit (kept, because removing a tag removes its page)

`tech/ai/ai_tech.md` (rust), `tech/ai/how_I_generate_logos_with_ai.md` (autohotkey), `random/pikachu_bobble_head.md` (linkedin), `tech/html_introduction.md` (csharp, dotnet, openbb), `tech/go/introduction_to_golang.md` (csharp, dotnet), `tech/java/publishing_package_for_java.md` (solidity, dapp), `tech/2023/csvs_with_cpp.md` (rust), `tech/css/how_to_implement_page_transitions_in_next_js.md` (chatgpt), `tech/python/personal_finance.md` (c), `tech/python/projects/password_generator.md` (tortoise_tts), `tech/js/how-to-use-react-native-navigation.md` (dotnet, git), `tech/js/node_v18_release.md` (react), `tech/rust/how_to_use_regular_expressions_in_rust.md` (python, requests, bs4), `tech/rust/intro_to_web_scrapping_in_rust.md` (chatgpt, flutter), many `tech/rust/*` posts (ffi, javascript, js).

## Not fixed: broken card images (`imgSrc`)

These `imgSrc` values point at files that don't exist under `public/` (pre-existing, not touched):
`/imgs/2023/other` (a directory), `/imgs/2023/{1212575964,1895495590,2432208319,2459005241,2955132952,30672838870,318527103,3281011769,4161054296}.png`,
`/imgs/2023/dall-e/upload_icon_cloud.png`, `/imgs/2024/leveraging-boost-cpp20.png`, DALL·E filenames that are truncated or have `?` instead of `·`,
and several `unsplash.com/photos/...` page URLs (not image URLs).
