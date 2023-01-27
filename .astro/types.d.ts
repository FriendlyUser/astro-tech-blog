declare module 'astro:content' {
	export { z } from 'astro/zod';
	export type CollectionEntry<C extends keyof typeof entryMap> =
		(typeof entryMap)[C][keyof (typeof entryMap)[C]] & Render;

	type BaseSchemaWithoutEffects =
		| import('astro/zod').AnyZodObject
		| import('astro/zod').ZodUnion<import('astro/zod').AnyZodObject[]>
		| import('astro/zod').ZodDiscriminatedUnion<string, import('astro/zod').AnyZodObject[]>
		| import('astro/zod').ZodIntersection<
				import('astro/zod').AnyZodObject,
				import('astro/zod').AnyZodObject
		  >;

	type BaseSchema =
		| BaseSchemaWithoutEffects
		| import('astro/zod').ZodEffects<BaseSchemaWithoutEffects>;

	type BaseCollectionConfig<S extends BaseSchema> = {
		schema?: S;
		slug?: (entry: {
			id: CollectionEntry<keyof typeof entryMap>['id'];
			defaultSlug: string;
			collection: string;
			body: string;
			data: import('astro/zod').infer<S>;
		}) => string | Promise<string>;
	};
	export function defineCollection<S extends BaseSchema>(
		input: BaseCollectionConfig<S>
	): BaseCollectionConfig<S>;

	type EntryMapKeys = keyof typeof entryMap;
	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidEntrySlug<C extends EntryMapKeys> = AllValuesOf<(typeof entryMap)[C]>['slug'];

	export function getEntryBySlug<
		C extends keyof typeof entryMap,
		E extends ValidEntrySlug<C> | (string & {})
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E
	): E extends ValidEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getCollection<C extends keyof typeof entryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E
	): Promise<E[]>;

	type InferEntrySchema<C extends keyof typeof entryMap> = import('astro/zod').infer<
		Required<ContentConfig['collections'][C]>['schema']
	>;

	type Render = {
		render(): Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
		}>;
	};

	const entryMap: {
		"blog": {
"Thoughts_after_using_dotnet_interactive.md": {
  id: "Thoughts_after_using_dotnet_interactive.md",
  slug: "thoughts_after_using_dotnet_interactive",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"adding_search_to_static_sites.md": {
  id: "adding_search_to_static_sites.md",
  slug: "adding_search_to_static_sites",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"adding_tagging_to_astro.md": {
  id: "adding_tagging_to_astro.md",
  slug: "adding_tagging_to_astro",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"attempting_to_sell_dall-e_images.md": {
  id: "attempting_to_sell_dall-e_images.md",
  slug: "attempting_to_sell_dall-e_images",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"bintray_removed_approaches.md": {
  id: "bintray_removed_approaches.md",
  slug: "bintray_removed_approaches",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"building_ticker_app_with_plotly_dash.md": {
  id: "building_ticker_app_with_plotly_dash.md",
  slug: "building_ticker_app_with_plotly_dash",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"consuming_twilio_media.md": {
  id: "consuming_twilio_media.md",
  slug: "consuming_twilio_media",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"creating_vuepress_theme.md": {
  id: "creating_vuepress_theme.md",
  slug: "creating_vuepress_theme",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"dall_e_experimentation_with_corgis.md": {
  id: "dall_e_experimentation_with_corgis.md",
  slug: "dall_e_experimentation_with_corgis",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"docker_hub_to_github_packages.md": {
  id: "docker_hub_to_github_packages.md",
  slug: "docker_hub_to_github_packages",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"extracting_types_from_openapi.md": {
  id: "extracting_types_from_openapi.md",
  slug: "extracting_types_from_openapi",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"heroku_shutdown_migrate_to_koyeb.md": {
  id: "heroku_shutdown_migrate_to_koyeb.md",
  slug: "heroku_shutdown_migrate_to_koyeb",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"how_to_make_show_more_component_in_react.md": {
  id: "how_to_make_show_more_component_in_react.md",
  slug: "how_to_make_show_more_component_in_react",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"install_wsl2_on_windows.md": {
  id: "install_wsl2_on_windows.md",
  slug: "install_wsl2_on_windows",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"introduction_to_flutter.md": {
  id: "introduction_to_flutter.md",
  slug: "introduction_to_flutter",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"lib_became_open_source.md": {
  id: "lib_became_open_source.md",
  slug: "lib_became_open_source",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"microservices_on_gae_shoestring_budget_20201128.md": {
  id: "microservices_on_gae_shoestring_budget_20201128.md",
  slug: "microservices_on_gae_shoestring_budget_20201128",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"random/linkedin_auto_suggestions.md": {
  id: "random/linkedin_auto_suggestions.md",
  slug: "random/linkedin_auto_suggestions",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"remove_background_from_image.md": {
  id: "remove_background_from_image.md",
  slug: "remove_background_from_image",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"remove_background_from_image_II.md": {
  id: "remove_background_from_image_II.md",
  slug: "remove_background_from_image_ii",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"remove_background_from_image_III.md": {
  id: "remove_background_from_image_III.md",
  slug: "remove_background_from_image_iii",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/build_dashboard_with_openbb.md": {
  id: "stonks/build_dashboard_with_openbb.md",
  slug: "stonks/build_dashboard_with_openbb",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/conscrap_2.0.0_release.md": {
  id: "stonks/conscrap_2.0.0_release.md",
  slug: "stonks/conscrap_200_release",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/get_transcript_of_youtube_livestreams_part_one.md": {
  id: "stonks/get_transcript_of_youtube_livestreams_part_one.md",
  slug: "stonks/get_transcript_of_youtube_livestreams_part_one",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/get_transcript_of_youtube_livestreams_part_two.md": {
  id: "stonks/get_transcript_of_youtube_livestreams_part_two.md",
  slug: "stonks/get_transcript_of_youtube_livestreams_part_two",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/gradio_ui_for_nlp_stonks.md": {
  id: "stonks/gradio_ui_for_nlp_stonks.md",
  slug: "stonks/gradio_ui_for_nlp_stonks",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/rbc_stock_trade_analyzer.md": {
  id: "stonks/rbc_stock_trade_analyzer.md",
  slug: "stonks/rbc_stock_trade_analyzer",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/scrapping_comments_from_yahoo_finance.md": {
  id: "stonks/scrapping_comments_from_yahoo_finance.md",
  slug: "stonks/scrapping_comments_from_yahoo_finance",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/scrapping_comments_from_yahoo_finance_II.md": {
  id: "stonks/scrapping_comments_from_yahoo_finance_II.md",
  slug: "stonks/scrapping_comments_from_yahoo_finance_ii",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/stock_dashboard_ta.md": {
  id: "stonks/stock_dashboard_ta.md",
  slug: "stonks/stock_dashboard_ta",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/web/generate_reports_with_13F_filings_with_markdown.md": {
  id: "stonks/web/generate_reports_with_13F_filings_with_markdown.md",
  slug: "stonks/web/generate_reports_with_13f_filings_with_markdown",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/web/scrap_from_sec_with_python.md": {
  id: "stonks/web/scrap_from_sec_with_python.md",
  slug: "stonks/web/scrap_from_sec_with_python",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"stonks/web_app_to_transcribe_audio.md": {
  id: "stonks/web_app_to_transcribe_audio.md",
  slug: "stonks/web_app_to_transcribe_audio",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/basic_react_native_template.md": {
  id: "tech/basic_react_native_template.md",
  slug: "tech/basic_react_native_template",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/building_out_latex_diagrams.md": {
  id: "tech/building_out_latex_diagrams.md",
  slug: "tech/building_out_latex_diagrams",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/dapps/tracking_files_with_a_smart_contract.md": {
  id: "tech/dapps/tracking_files_with_a_smart_contract.md",
  slug: "tech/dapps/tracking_files_with_a_smart_contract",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/dapps/url_shortener_with_nuxt.md": {
  id: "tech/dapps/url_shortener_with_nuxt.md",
  slug: "tech/dapps/url_shortener_with_nuxt",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/evaluating_whispers_vs_current_alternatives.md": {
  id: "tech/evaluating_whispers_vs_current_alternatives.md",
  slug: "tech/evaluating_whispers_vs_current_alternatives",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/flutter/pokedex_app_partI.md": {
  id: "tech/flutter/pokedex_app_partI.md",
  slug: "tech/flutter/pokedex_app_parti",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/flutter/pokedex_app_partII.md": {
  id: "tech/flutter/pokedex_app_partII.md",
  slug: "tech/flutter/pokedex_app_partii",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/flutter/resume_generation_dart.md": {
  id: "tech/flutter/resume_generation_dart.md",
  slug: "tech/flutter/resume_generation_dart",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/flutter/scrapping_data_for_pokedex.md": {
  id: "tech/flutter/scrapping_data_for_pokedex.md",
  slug: "tech/flutter/scrapping_data_for_pokedex",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/flutter_app_for_trump_quotes.md": {
  id: "tech/flutter_app_for_trump_quotes.md",
  slug: "tech/flutter_app_for_trump_quotes",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/flutter_todo_list_with_supabase.md": {
  id: "tech/flutter_todo_list_with_supabase.md",
  slug: "tech/flutter_todo_list_with_supabase",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/getting_started_with_strapi_cloud.md": {
  id: "tech/getting_started_with_strapi_cloud.md",
  slug: "tech/getting_started_with_strapi_cloud",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/grabbing_top_anime_shows_from_mal.md": {
  id: "tech/grabbing_top_anime_shows_from_mal.md",
  slug: "tech/grabbing_top_anime_shows_from_mal",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/java/publishing_package_for_java.md": {
  id: "tech/java/publishing_package_for_java.md",
  slug: "tech/java/publishing_package_for_java",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/jcenter_crashing_react_native_app.md": {
  id: "tech/jcenter_crashing_react_native_app.md",
  slug: "tech/jcenter_crashing_react_native_app",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/js/how_to_use_resolutions_in_package_json.md": {
  id: "tech/js/how_to_use_resolutions_in_package_json.md",
  slug: "tech/js/how_to_use_resolutions_in_package_json",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/js/implementing_svg_styling_in_nextjs.md": {
  id: "tech/js/implementing_svg_styling_in_nextjs.md",
  slug: "tech/js/implementing_svg_styling_in_nextjs",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/js/simple_chat_bot.mdx": {
  id: "tech/js/simple_chat_bot.mdx",
  slug: "tech/js/simple_chat_bot",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/js/what_is_a_package_json_file.md": {
  id: "tech/js/what_is_a_package_json_file.md",
  slug: "tech/js/what_is_a_package_json_file",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/net/intro_to_linq.md": {
  id: "tech/net/intro_to_linq.md",
  slug: "tech/net/intro_to_linq",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/net/minimum_api_ip_address.md": {
  id: "tech/net/minimum_api_ip_address.md",
  slug: "tech/net/minimum_api_ip_address",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/parsing_git_commits_with_dotnet.md": {
  id: "tech/parsing_git_commits_with_dotnet.md",
  slug: "tech/parsing_git_commits_with_dotnet",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/python/chatgpt_blog_generation.md": {
  id: "tech/python/chatgpt_blog_generation.md",
  slug: "tech/python/chatgpt_blog_generation",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/python/simple_deta_micro_service_to_view_uploaded_files.md": {
  id: "tech/python/simple_deta_micro_service_to_view_uploaded_files.md",
  slug: "tech/python/simple_deta_micro_service_to_view_uploaded_files",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/react_corp_landing_page.md": {
  id: "tech/react_corp_landing_page.md",
  slug: "tech/react_corp_landing_page",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/screenshot_utility_for_mobile_apps.md": {
  id: "tech/screenshot_utility_for_mobile_apps.md",
  slug: "tech/screenshot_utility_for_mobile_apps",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/scripting/argparse_with_python.md": {
  id: "tech/scripting/argparse_with_python.md",
  slug: "tech/scripting/argparse_with_python",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/scripting/caching_with_github_actions.md": {
  id: "tech/scripting/caching_with_github_actions.md",
  slug: "tech/scripting/caching_with_github_actions",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/scripting/creating_my_own_subs.md": {
  id: "tech/scripting/creating_my_own_subs.md",
  slug: "tech/scripting/creating_my_own_subs",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/scripting/github_action_to_detect_ip_address.md": {
  id: "tech/scripting/github_action_to_detect_ip_address.md",
  slug: "tech/scripting/github_action_to_detect_ip_address",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/scripting/parsing_git_commits_with_golang.md": {
  id: "tech/scripting/parsing_git_commits_with_golang.md",
  slug: "tech/scripting/parsing_git_commits_with_golang",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/scripting/pokemon_analytics.md": {
  id: "tech/scripting/pokemon_analytics.md",
  slug: "tech/scripting/pokemon_analytics",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/scripting/uploading_apks_to_google_drive_in_bitrise.md": {
  id: "tech/scripting/uploading_apks_to_google_drive_in_bitrise.md",
  slug: "tech/scripting/uploading_apks_to_google_drive_in_bitrise",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/scripting/using_git_to_filter_for_commits.md": {
  id: "tech/scripting/using_git_to_filter_for_commits.md",
  slug: "tech/scripting/using_git_to_filter_for_commits",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/simple_collapsible_component.md": {
  id: "tech/simple_collapsible_component.md",
  slug: "tech/simple_collapsible_component",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/simple_script_to_checkout_files.md": {
  id: "tech/simple_script_to_checkout_files.md",
  slug: "tech/simple_script_to_checkout_files",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/spaceshooter_in_go.md": {
  id: "tech/spaceshooter_in_go.md",
  slug: "tech/spaceshooter_in_go",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/updating_list_of_entries_in_react.md": {
  id: "tech/updating_list_of_entries_in_react.md",
  slug: "tech/updating_list_of_entries_in_react",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/upgrading_from_muiv4_to_mui_v5.md": {
  id: "tech/upgrading_from_muiv4_to_mui_v5.md",
  slug: "tech/upgrading_from_muiv4_to_mui_v5",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/uploading_videos_in_youtube_through_the_api.md": {
  id: "tech/uploading_videos_in_youtube_through_the_api.md",
  slug: "tech/uploading_videos_in_youtube_through_the_api",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/using_remotion_to_make_videos.md": {
  id: "tech/using_remotion_to_make_videos.md",
  slug: "tech/using_remotion_to_make_videos",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/using_whispers_to_transcribe_youtube_videos.md": {
  id: "tech/using_whispers_to_transcribe_youtube_videos.md",
  slug: "tech/using_whispers_to_transcribe_youtube_videos",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tech/video_for_game_highlights.md": {
  id: "tech/video_for_game_highlights.md",
  slug: "tech/video_for_game_highlights",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"thoughts_after_using_simply_static.md": {
  id: "thoughts_after_using_simply_static.md",
  slug: "thoughts_after_using_simply_static",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"thoughts_on_dash_v250.md": {
  id: "thoughts_on_dash_v250.md",
  slug: "thoughts_on_dash_v250",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"tracking_youtube_videos_with_nlp.md": {
  id: "tracking_youtube_videos_with_nlp.md",
  slug: "tracking_youtube_videos_with_nlp",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
},

	};

	type ContentConfig = typeof import("../src/content/config");
}
