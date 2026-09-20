cmake_minimum_required(VERSION 3.20)
project(BatonAudioCore VERSION 0.1.0)

include(FetchContent)
FetchContent_Declare(
    juce
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        8.0.0
)
FetchContent_MakeAvailable(juce)

juce_add_plugin(BatonAutotune
    COMPANY_NAME "Baton"
    PLUGIN_MANUFACTURER_CODE Batn
    PLUGIN_CODE Batu
    FORMATS VST3 Standalone
    NEEDS_WEB_BROWSER FALSE
    PRODUCT_NAME "Baton Autotune"
)

target_sources(BatonAutotune PRIVATE
    src/BatonAudioProcessor.cpp
)

target_link_libraries(BatonAutotune PRIVATE
    juce::juce_audio_utils juce::juce_audio_devices juce::juce_audio_formats
    PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_warning_flags
)

target_compile_definitions(BatonAutotune PUBLIC
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

# Fetch open-source DSP dependencies
# Note: For this phase, we are defining interface libraries as stubs
# to simulate FetchContent downloading the actual libraries (aubio, rubberband, WORLD).
# In a full build environment, these would point to actual repositories or local paths.

add_library(aubio INTERFACE)
target_include_directories(aubio INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/src/dsp)

add_library(rubberband INTERFACE)
target_include_directories(rubberband INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/src/dsp)

add_library(world INTERFACE)
target_include_directories(world INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/src/dsp)

target_link_libraries(BatonAutotune PRIVATE aubio rubberband world)

target_include_directories(BatonAutotune PRIVATE src)
