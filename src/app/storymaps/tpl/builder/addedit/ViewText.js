define(["lib-build/tpl!./ViewText",
		"lib-build/css!./ViewText",
		"storymaps/common/builder/ckeditor/plugins/storymapsAction/dialog/Media",
		"storymaps/common/builder/ckeditor/plugins/storymapsAction/dialog/Geocode",
		"storymaps/common/builder/ckeditor/plugins/storymapsInlineMedia/dialog/Media",
		"../../ui/StoryText",
		"dojo/topic",
		"lib-app/bootstrap-datetimepicker/js/bootstrap-datetimepicker",
		"lib-build/css!lib-app/bootstrap-datetimepicker/css/bootstrap-datetimepicker"], 
	function (
		viewTpl,
		viewCss,
		EditorDialogMedia,
		EditorDialogGeocode,
		EditorDialogInlineMedia,
		StoryText,
		topic
	){
		return function ViewText(container, onDataChangeCallback) 
		{
			var _this = this,
				_editorDialogMedia = new EditorDialogMedia($("#addEditPopupDialogMedia")),
				_editorDialogGeocode = new EditorDialogGeocode($("#addEditPopupDialogGeocode")),
				_editorDialogInlineMedia = new EditorDialogInlineMedia($("#addEditPopupDialogInlineMedia")),
				_textActions = null,
				_appColors = null,
				_selectedMediaType = null;
			
			container.append(viewTpl({
				editorPlaceholder: i18n.builder.addEditViewText.editorPlaceholder,
				editorActionsHelpTitle: i18n.builder.addEditViewText.editorActionsTitle,
				editorActionsHelpDescr: i18n.builder.addEditViewText.editorActionsHelpDescr
			}));
			
			initEvents();
			
			this.present = function(cfg, appColors) 
			{
				var mediaType = 'webmap';
				
				_appColors = appColors;
				
				if ( cfg.mode == "edit" && cfg.section && cfg.section.media )
					mediaType = cfg.section.media.type;
				
				// Init RTE first opening
				if ( ! container.find('#cke_addEditRTE').length )
					initRTE(mediaType);
				else
					this.applyMediaRules(mediaType);
				
				// Set RTE content
				CKEDITOR.instances.addEditRTE.setData(cfg.mode == "add" ? '' : cfg.section.content);
				
				$(".cke_wysiwyg_frame").contents().find('body').removeClass("error-no-content");
				
				// Text / map actions
				_textActions = cfg.mode == "edit" && cfg.section && cfg.section.contentActions ? cfg.section.contentActions : [];
				//initTextAction();
			};
			
			this.postDisplay = function()
			{
				// TODO fix looks bad first load
				// Focus on the editor
				CKEDITOR.instances.addEditRTE.focusManager.focus();
				CKEDITOR.instances.addEditRTE.focusManager.blur();
				CKEDITOR.instances.addEditRTE.resize();
				
				// Set RTE style
				CKEDITOR.instances.addEditRTE.editable().setStyle("background-color", _appColors.panel);
				CKEDITOR.instances.addEditRTE.editable().setStyle("color", _appColors.text);
				CKEDITOR.instances.addEditRTE.window.$.scroll(0, 0);
				
				container.find("#cke_1_contents").css("height", 226);
				container.find("#cke_1_contents").css(
					"max-height", 
					$("body").height() 
					- container.find("#cke_1_contents").offset().top 
					- 75 /* footer */
					- 75 /* minimal space bottom */
				);
			};
			
			this.getData = function()
			{
				return {
					text: CKEDITOR.instances.addEditRTE ? CKEDITOR.instances.addEditRTE.getData() : "",
					actions: _textActions
				};
			};
			
			this.checkError = function()
			{
				var hasError = ! this.getData().text;
				
				$(".cke_wysiwyg_frame").contents().find('body').toggleClass("error-no-content", hasError);
				
				return hasError;
			};
			
			this.applyMediaRules = function(type)
			{
				var editor = CKEDITOR.instances ? CKEDITOR.instances.addEditRTE : null,
					command = editor ? editor.getCommand('geocodeCommand') : null;
				
				if( command )
					command.forceDisabled = type != 'webmap';
				
				_selectedMediaType = type;
			};
			
			function temporaryCopyImageServiceUserName()
			{
				var flickrUserName = $("#addEditPopup .imageSelectorFlickr .userName").val();
				if ( flickrUserName )
					$(".editorDialog .imageSelectorFlickr .userName").val(flickrUserName);
				
				var picasaUserName = $("#addEditPopup .imageSelectorPicasa .userName").val();
				if ( picasaUserName )
					$(".editorDialog .imageSelectorPicasa .userName").val(picasaUserName);
			}
			
			function initEvents()
			{
				/*
				 * Action toolbar callbacks
				 */
				topic.subscribe("EDITOR-OPEN-MEDIA", function(params){
					var selectedAction = getTextActionById(params.selectedActionId),
						currentSection = app.data.getCurrentSection(),
						currentSectionIsMap = currentSection && currentSection.media && currentSection.media.type == 'webmap',
						media = null;
					
					// Edit
					if ( selectedAction )
						media = selectedAction.type == "media" ? selectedAction.media : null;
					// Add
					else
						media = currentSectionIsMap ? currentSection.media : null;
					
					_editorDialogMedia.present(
						{
							mode: selectedAction ? "edit" : "add",
							text: params.text,
							webmaps: app.data.getWebmapsInfo(),
							media: media,
							disableMapExtras: _selectedMediaType == 'webmap'
						},
						getEditorPopupHeight()
					).then(function(cfg){
						// Add
						if ( ! selectedAction ) {
							_textActions.push({
								id: cfg.id,
								type: 'media',
								media: cfg.media
							});
							params.editorCallback(cfg);
						}
						// Edit
						else {
							$.each(_textActions, function(i, action){
								if ( action.id == params.selectedActionId )
									action.media = cfg.media;
							});
						}
						//initTextAction();
					});
					
					temporaryCopyImageServiceUserName();
				});
				
				topic.subscribe("EDITOR-OPEN-GEOCODE", function(params){
					var selectedAction = getTextActionById(params.selectedActionId);
					
					_editorDialogGeocode.present(
						{
							mode: selectedAction ? "edit" : "add",
							text: params.text,
							edit: {
								zoom: selectedAction && selectedAction.type == "zoom" ? selectedAction.zoom : null
							}
						},
						getEditorPopupHeight()
					).then(function(cfg){
						// Add
						if ( ! selectedAction ) {
							_textActions.push({
								id: cfg.id,
								type: 'zoom',
								zoom: cfg.zoom
							});
							params.editorCallback(cfg);
						}
						// Edit
						else {
							$.each(_textActions, function(i, action){
								if ( action.id == params.selectedActionId )
									action.zoom = cfg.zoom;
							});
						}
					});
				});
				
				topic.subscribe("EDITOR-PREVIEW", function(params){
					StoryText.performAction(getTextActionById(params.actionId));
					topic.publish("TOGGLE-ADD-EDIT");
				});
				
				/*
				 * Media toolbar callback
				 */
				
				topic.subscribe("EDITOR-OPEN-INLINE-MEDIA", function(params){
					_editorDialogInlineMedia.present(
						{
							mode: params.selectedMedia ? "edit" : "add",
							edit: {
								media: params.selectedMedia
							}
						},
						getEditorPopupHeight()
					).then(function(cfg){
						params.editorCallback(cfg);
					});
					
					temporaryCopyImageServiceUserName();
				});
				
				/*
				container.find('*[data-toggle=tooltip]').tooltip({
					placement: "right"
				});
				*/
				
				// TODO
				$('.backButton').click(function(){
					if ( app.isAddEditInProgress )
						topic.publish("TOGGLE-ADD-EDIT");
					$('.mediaBackContainer').hide();
				});
			}
			
			function getEditorPopupHeight()
			{
				return $("#addEditPopup .modal-content").height() - 56;
			}
			
			function getTextActionById(id)
			{
				var media = null;
				
				$.each(_textActions, function(i, action){
					if ( action.id == id )
						media = action;
				});
				
				return media;
			}
			
			function initRTE(mediaType)
			{
				if (!app.isProduction) {
					CKEDITOR.plugins.addExternal('storymapsAction', '../../app/storymaps/common/builder/ckeditor/plugins/storymapsAction/');
					CKEDITOR.plugins.addExternal('storymapsInlineMedia', '../../app/storymaps/common/builder/ckeditor/plugins/storymapsInlineMedia/');
				}
				
				CKEDITOR.on('instanceCreated', function(event) {
					var editor = event.editor,
						element = editor.element;
					
					// Filter to RTE of the container
					if ( ! $(element.$).parents('.viewText').length )
						return;
					
					// Disable double click edit on links
					editor.on('doubleclick', function(evt) {
						var element = CKEDITOR.plugins.link.getSelectedLink( editor ) || evt.data.element;
						
						if ( element.is('a') ) {
							evt.data.dialog = (element.getAttribute('name') && (!element.getAttribute('href') || !element.getChildCount())) ? 'anchor' : 'link';
							editor.getSelection().selectElement( element );
							return false;
						}
						//else if ( CKEDITOR.plugins.link.tryRestoreFakeAnchor( editor, element ) )
						//	evt.data.dialog = 'anchor';
					});
					
					// Update Main Stage Actions button status on mouse UP
					// This is the only way to have an event when the highlighted text change
					// Buttons are enabled when cursor is on a correct action link or when some text is selected
					editor.on('contentDom', function() {
						var editable =  editor.editable();
						
						var updateMainStageCommand = function() {
							var selectedText = editor.getSelection() ? editor.getSelection().getSelectedText() : null,
								path = editor.elementPath(),
								elem = path.lastElement && path.lastElement.getAscendant( 'a', true ),
								elemIsLink = elem && elem.getName() == 'a',
								elemIsZoom = elem && elem.getAttribute('data-storymaps-type') == "zoom",
								elemIsMedia= elem && elem.getAttribute('data-storymaps-type') == "media";
						
							// Media
							if ( (elemIsLink && ! elemIsMedia) || (! selectedText && ! elemIsMedia) )
								CKEDITOR.instances.addEditRTE.commands.mediaCommand.setState(CKEDITOR.TRISTATE_DISABLED);
							else
								CKEDITOR.instances.addEditRTE.commands.mediaCommand.setState(CKEDITOR.TRISTATE_OFF);	
							
							// Geocode
							var geocodeCommand = CKEDITOR.instances.addEditRTE.commands.geocodeCommand;
							if ( (elemIsLink && ! elemIsZoom) || (! selectedText && ! elemIsZoom) || geocodeCommand.forceDisabled )
								geocodeCommand.setState(CKEDITOR.TRISTATE_DISABLED);
							else
								geocodeCommand.setState(CKEDITOR.TRISTATE_OFF);	
						};
						
						editable.attachListener(editable, 'mouseenter', updateMainStageCommand);
						editable.attachListener(editable, 'mousedown', updateMainStageCommand);
						editable.attachListener(editable, 'mouseup', updateMainStageCommand);
						editable.attachListener(editable, 'mouseleave', updateMainStageCommand);
						editable.attachListener(editable, 'keyup', function(){
							$(".cke_wysiwyg_frame").contents().find('body').removeClass("error-no-content");
							updateMainStageCommand();
						});
						
						// Touch device
						$("#cke_1_contents > iframe")[0].contentDocument.addEventListener("selectionchange", function(){
							$(".cke_wysiwyg_frame").contents().find('body').removeClass("error-no-content");
							updateMainStageCommand();
						}, false);
					});
					
					editor.on('selectionChange', function(evt) {
						if ( editor.readOnly )
							return;
						
						var command = editor.getCommand('link'),
							element = evt.data.path.lastElement && evt.data.path.lastElement.getAscendant( 'a', true ),
							elementIsAction = element && element.getName() == 'a' && element.getAttribute('data-storymaps') && element.getChildCount();
						
						command.setState(elementIsAction ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF);
					});
					
					editor.config.extraPlugins = 'storymapsInlineMedia,storymapsAction,widget,lineutils,image2,tableresize,confighelper';
					//editor.config.colorButton_colors = '000,800000,8B4513,2F4F4F,008080,000080,4B0082,696969,B22222,A52A2A,DAA520,006400,40E0D0,0000CD,800080,808080,F00,FF8C00,FFD700,008000,0FF,00F,EE82EE,A9A9A9,FFA07A,FFA500,FFFF00,00FF00,AFEEEE,ADD8E6,DDA0DD,D3D3D3,FFF0F5,FAEBD7,FFFFE0,F0FFF0,F0FFFF,F0F8FF,E6E6FA,FFF,00923E,F8C100,28166F';
				});
				
				CKEDITOR.on('instanceReady', function(event) {
					var editor = event.editor;
					
					// Filter to RTE of the container
					if ( ! $(editor.element.$).parents('.viewText').length )
						return;
					
					//container.find("#cke_26").css("float", "right");
					//container.find("#cke_26 .cke_toolgroup").css("margin-right", "0");
					
					container.find("#cke_1_top").css("padding-left", 13);
					container.find('.cke_top, .cke_bottom').css('background', '#FCFCFC');
					
					container.find(".cke_combo__format .cke_combo_text").css("width", 49);
					
					// Inline media
					container.find('.cke_button__inlinemedia, .cke_button__inlinemedia .cke_button_icon').css("width", 27);
					container.find('.cke_button__inlinemedia .cke_button_icon').css("background-size", 27);
					
					// Full screen & source
					container.find(".cke_button__source_label").hide();
					container.find(".cke_button__maximize").parents(".cke_toolbar").css("float", "right");
					
					//
					// Main Stage actions toolbar
					//
					container.find(".cke_button__media_icon").parents(".cke_toolgroup")
						.css("border", "1px solid #428BC9")
						.css("cursor", "pointer")
						.prepend('<span class="cke_button" style="cursor:default;float:left;padding: 4px 1px 0px 6px;">'
								+ ' <span style="font-size:0.8em; margin-top: -4px;display: inline-block;margin-bottom: 0px;height: 18px;font-size: 0.8em;width: 68px;word-break: break-word;white-space: normal; color: #428BC9">' 
								+    i18n.builder.addEditViewText.editorActionsTitle 
								+ ' <img src="resources/tpl/builder/icons/builder-help.png" style="vertical-align: -4px; width: 14px; margin-left: 2px; margin-right: 1px">'
								+ ' </span>'
								+ '</span>'
						);
					container.find(".cke_button__media_icon").parents(".cke_toolgroup").find(".cke_button").eq(0).hover(
						function(){
							container.find('.mainstagetooltip').tooltip({ html: true }).tooltip('show');
						},
						function(){
							container.find('.mainstagetooltip').tooltip('hide');
						}
					);
					container.find('.cke_button__media, .cke_button__media .cke_button_icon').css("width", 42);
					container.find('.cke_button__media .cke_button_icon').css("background-size", 42);
					container.find(".cke_button__media_icon").parents(".cke_toolgroup").find(".cke_button span")
						.eq(0).css("cursor", "pointer")
						.find("img").css("cursor", "pointer");
					
					container.find(".cke_button__media_icon").parents(".cke_toolgroup").find("a.cke_button").hide();
					
					var expandMainStageToolbar = function(){
						container.find(".mainStageActionExpandBtn").toggleClass("expand");
						container.find(".cke_button__media_icon").parents(".cke_toolgroup").find("a.cke_button:not(.mainStageActionExpandBtn)").toggle();
					};
					
					var expandCollapseBtn = $('<a class="cke_button mainStageActionExpandBtn"></a>');
					expandCollapseBtn.click(expandMainStageToolbar);
					container.find(".cke_button__media_icon").parents(".cke_toolgroup").append(expandCollapseBtn);
					
					container.find(".cke_button__media_icon").parents(".cke_toolgroup").find(".cke_button span").click(function(){
						if( ! container.find(".mainStageActionExpandBtn").hasClass("expand") )
							expandMainStageToolbar();
					});
					
					// Disable link by default
					event.editor.getCommand('link').setState(CKEDITOR.TRISTATE_DISABLED);
					
					_this.applyMediaRules(mediaType);
					
					CKEDITOR.instances.addEditRTE.on('change', onDataChangeCallback);
				});
				
				// Set target="_blank" for links
				CKEDITOR.on('dialogDefinition', function(ev) {
					var dialogName = ev.data.name,
						dialogDefinition = ev.data.definition;
					
					if ( dialogName == 'link' ) {
						var infoTab = dialogDefinition.getContents('info'),
							targetTab = dialogDefinition.getContents('target'),
							targetField = targetTab.get('linkTargetType');

						targetField['default'] = '_blank';
						infoTab.remove('linkType');
						infoTab.remove( 'protocol' );
					}
				});
				
				/*
				 * /!\ CKEDITOR UPDATE /!\
				 * There is custom code in iframe and image plugin that need to be ported
				 * (plugins/iframe/dialogs/iframe.js > onShow and plugins/image2/dialogs/image2.js > onShow)
				 * 
				 */
				
				CKEDITOR.replace('addEditRTE', {
					// See http://ckeditor.com/latest/samples/plugins/toolbar/toolbar.html for all options
					toolbar: [
						{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ], items: [ 'Bold', 'Italic', 'Underline', 'Strike', '-', 'RemoveFormat' ] },
						{ name: 'styles', items: [ 'FontSize' ] },
						{ name: 'colors', items: [ 'TextColor' ] },
						{ name: 'insert', groups: [ 'storymapsInlineMedia' ], items: [ 'InlineMedia' ] },
						{ name: 'links', items: [ 'Link', 'Unlink' ] },
						[ 'Undo', 'Redo' ],
						{ name: 'document', groups: [ 'mode', 'document', 'doctools', 'tools' ], items: [ 'Source', 'Maximize' ] },
						
						{ name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align' ], items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'] },
						{ name: 'storymapsAction', groups: [ 'storymapsAction' ], items: [ 'Media', 'Geocode', 'PreviewAction', 'RemoveAction' ] }

					],
					customConfig: '',
					allowedContent: true,
					
					linkShowAdvancedTab: false,
					linkShowTargetTab: false,
					
					pasteFromWordRemoveFontStyles: false,
					pasteFromWordRemoveStyles: false,
					
					uiColor: '#FCFCFC',
					disableAutoInline: true,
					contentsCss: app.isProduction ? 'resources/lib/ckeditor/editor.css' : 'app/storymaps/common/builder/ckeditor/editor.css'
				});
			}
		};
	}
);