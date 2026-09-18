#include "BatonAudioProcessor.h"

BatonAudioProcessor::BatonAudioProcessor()
    : AudioProcessor (BusesProperties()
                      .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      parameters (*this, nullptr, juce::Identifier ("BatonAutotune"), createParameterLayout())
{
    retuneSpeedParam = parameters.getRawParameterValue("retune_speed");
    correctionAmountParam = parameters.getRawParameterValue("correction_amount");
    formantShiftParam = parameters.getRawParameterValue("formant_shift");
}

BatonAudioProcessor::~BatonAudioProcessor()
{
}

juce::AudioProcessorValueTreeState::ParameterLayout BatonAudioProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    params.push_back (std::make_unique<juce::AudioParameterFloat> (juce::ParameterID("retune_speed", 1), "Retune Speed", juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 50.0f));
    params.push_back (std::make_unique<juce::AudioParameterFloat> (juce::ParameterID("correction_amount", 1), "Correction Amount", juce::NormalisableRange<float>(0.0f, 100.0f, 1.0f), 100.0f));
    params.push_back (std::make_unique<juce::AudioParameterInt> (juce::ParameterID("key", 1), "Key", 0, 11, 0)); // 0 = C, 1 = C#, etc.
    params.push_back (std::make_unique<juce::AudioParameterChoice> (juce::ParameterID("scale", 1), "Scale", juce::StringArray{"Major", "Minor", "Chromatic"}, 2));
    params.push_back (std::make_unique<juce::AudioParameterFloat> (juce::ParameterID("formant_shift", 1), "Formant Shift", juce::NormalisableRange<float>(-12.0f, 12.0f, 0.1f), 0.0f));
    params.push_back (std::make_unique<juce::AudioParameterBool> (juce::ParameterID("formant_preserve", 1), "Formant Preserve", true));

    return { params.begin(), params.end() };
}

void BatonAudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    pitchDetector = std::make_unique<PitchDetector>(static_cast<int>(sampleRate), samplesPerBlock);
    pitchShifter = std::make_unique<PitchShifter>(static_cast<int>(sampleRate), getTotalNumInputChannels());
    formantShifter = std::make_unique<FormantShifter>(static_cast<int>(sampleRate));
}

void BatonAudioProcessor::releaseResources()
{
}

bool BatonAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    return true;
}

void BatonAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    // Read parameters
    auto retuneSpeed = retuneSpeedParam ? retuneSpeedParam->load() : 50.0f;
    auto correctionAmount = correctionAmountParam ? correctionAmountParam->load() : 100.0f;
    auto formantShift = formantShiftParam ? formantShiftParam->load() : 0.0f;

    // DSP processing chain stubs
    if (totalNumInputChannels > 0) {
        float* channelData = buffer.getWritePointer(0);
        int numSamples = buffer.getNumSamples();
        float* const* buffers = buffer.getArrayOfWritePointers();

        // 1. Pitch detection
        if (pitchDetector)
            pitchDetector->process(channelData, numSamples);

        // 2. Pitch correction / shifting
        if (pitchShifter) {
            // Apply logic based on retuneSpeed and correctionAmount
            pitchShifter->setPitchShift(0.0f); // Stub logic
            pitchShifter->process(buffers, numSamples);
        }

        // 3. Formant preservation/shifting
        if (formantShifter) {
            formantShifter->setFormantShift(formantShift);
            formantShifter->process(buffers, numSamples);
        }
    }
}

juce::AudioProcessorEditor* BatonAudioProcessor::createEditor()
{
    return new juce::GenericAudioProcessorEditor (*this);
}

bool BatonAudioProcessor::hasEditor() const
{
    return true;
}

const juce::String BatonAudioProcessor::getName() const
{
    return "BatonAutotune";
}

bool BatonAudioProcessor::acceptsMidi() const
{
    return false;
}

bool BatonAudioProcessor::producesMidi() const
{
    return false;
}

bool BatonAudioProcessor::isMidiEffect() const
{
    return false;
}

double BatonAudioProcessor::getTailLengthSeconds() const
{
    return 0.0;
}

int BatonAudioProcessor::getNumPrograms()
{
    return 1;
}

int BatonAudioProcessor::getCurrentProgram()
{
    return 0;
}

void BatonAudioProcessor::setCurrentProgram (int index)
{
}

const juce::String BatonAudioProcessor::getProgramName (int index)
{
    return {};
}

void BatonAudioProcessor::changeProgramName (int index, const juce::String& newName)
{
}

void BatonAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    auto state = parameters.copyState();
    std::unique_ptr<juce::XmlElement> xml (state.createXml());
    copyXmlToBinary (*xml, destData);
}

void BatonAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState (getXmlFromBinary (data, sizeInBytes));
    if (xmlState != nullptr)
        if (xmlState->hasTagName (parameters.state.getType()))
            parameters.replaceState (juce::ValueTree::fromXml (*xmlState));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new BatonAudioProcessor();
}
