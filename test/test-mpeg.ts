import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';
import {SourceStream} from "./util";

const t = assert;

describe("MPEG parsing", () => {

  it("should parse MPEG-1 Audio Layer II ", () => {
    /**
     * No errors found in file.
     *
     * Summary:
     * ===============
     * Total number of frames: 20, unpadded: 1, padded: 19
     * File is CBR. Bitrate of each frame is 128 kbps.
     * Exact length: 00:00
     *
     * FooBar: 22559 samples
     */
    const filePath = path.join(__dirname, 'samples', "1971 - 003 - Sweet - Co-Co - CannaPower.mp2");

    return mm.parseFile(filePath, {duration: true, native: true}).then((metadata) => {

      t.strictEqual(metadata.format.dataformat, "mp2", "format.dataformat = mp2 (MPEG-2 Audio Layer II)");
      t.strictEqual(metadata.format.bitrate, 128000, "format.bitrate = 128 kbit/sec");
      t.strictEqual(metadata.format.sampleRate, 44100, "format.sampleRate = 44.1 kHz");
      // t.strictEqual(metadata.format.numberOfSamples, 22559, "format.numberOfSamples = 22559");
      // t.strictEqual(metadata.format.duration, 22559 / 44100, "format.durarion = ~0.512 sec"); // ToDo: take ID3v1 header into account
      t.deepEqual(metadata.format.tagTypes, ["ID3v2.3", "ID3v1.1"], "Tags: ID3v1 & ID3v2.3");

    });
  });

  it("sync efficiency, using stream", function() {

    this.skip(); // ToDo

    this.timeout(15000); // It takes a log time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

    const emptyStreamSize = 5 * 1024 * 1024;

    const buf = new Buffer(emptyStreamSize).fill(0);
    const streamReader = new SourceStream(buf);

    return mm.parseStream(streamReader, 'audio/mpeg', {duration: true, native: true}).then((result) => {
      throw new Error('Should fail');
    }).catch((err) => {
      t.isDefined(err);
      t.strictEqual(err.message, "expected file identifier 'ID3' not found");
    });

  });

  it("sync efficiency, using file", function() {

    this.skip(); // ToDo

    this.timeout(15000); // It takes a log time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

    const filePath = path.join(__dirname, "samples", "issue", "13 - Zillertaler Schürzenjäger - Die Welt is koa Glashaus.mp3");

    return mm.parseFile(filePath, {duration: true, native: true}).then((result) => {
      throw new Error('Should fail');
    }).catch((err) => {
      t.isDefined(err);
      t.strictEqual(err.message, "expected file identifier 'ID3' not found");
    });

  });

  describe("mpeg parsing fails for irrelevant attributes #14", () => {

    // tslint:disable:only-arrow-functions
    it("should decode 04 - You Don't Know.mp3", function() {

      /**
       * File has id3v2.3 & id3v1 tags
       * First frame is 224 kbps, rest 320 kbps
       * After id3v2.3, lots of 0 padding
       */
      this.timeout(15000); // It takes a long time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

      const filePath = path.join(__dirname, 'samples', "04 - You Don't Know.mp3");

      function checkFormat(format) {
        t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1.1'], 'format.tagTypes');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(format.numberOfSamples, 9099648, 'format.numberOfSamples'); // FooBar says 3:26.329 seconds (9.099.119 samples)
        t.strictEqual(format.duration, 206.3412244897959, 'format.duration'); // FooBar says 3:26.329 seconds (9.099.119 samples)
        t.strictEqual(format.bitrate, 320000, 'format.bitrate = 128 kbit/sec');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');

        // t.strictEqual(format.encoder, 'LAME3.91', 'format.encoder');
        // t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
      }

      function checkCommon(common) {
        t.strictEqual(common.title, "You Don't Know", 'common.title');
        t.deepEqual(common.artists, ['Reel Big Fish'], 'common.artists');
        t.strictEqual(common.albumartist, 'Reel Big Fish', 'common.albumartist');
        t.strictEqual(common.album, 'Why Do They Rock So Hard?', 'common.album');
        t.strictEqual(common.year, 1998, 'common.year');
        t.strictEqual(common.track.no, 4, 'common.track.no');
        t.strictEqual(common.track.of, null, 'common.track.of');
        t.strictEqual(common.disk.no, null, 'common.disk.no');
        t.strictEqual(common.disk.of, null, 'common.disk.of');
        t.strictEqual(common.genre[0], 'Ska-Punk', 'common.genre');
      }

      function checkID3v1(id3v1: mm.INativeTagDict) {

        t.deepEqual(id3v1.artist, ['Reel Big Fish'], 'id3v1.artist');
        t.deepEqual(id3v1.title, ["You Don't Know"], 'id3v1.title');
        t.deepEqual(id3v1.album, ['Why Do They Rock So Hard?'], 'id3v1.album');
        t.deepEqual(id3v1.year, ['1998'], '(id3v1.year');
        t.deepEqual(id3v1.track, [4], 'id3v1.track');
        t.deepEqual(id3v1.comment, ['000010DF 00000B5A 00007784'], 'id3v1.comment');
      }

      function checkID3v23(id3v23: mm.INativeTagDict) {

        t.deepEqual(id3v23.TPE2, ['Reel Big Fish'], 'native: TPE2');
        t.deepEqual(id3v23.TIT2, ["You Don't Know"], 'native: TIT2');
        t.deepEqual(id3v23.TALB, ['Why Do They Rock So Hard?'], 'native: TALB');
        t.deepEqual(id3v23.TPE1, ['Reel Big Fish'], 'native: TPE1');
        t.deepEqual(id3v23.TCON, ['Ska-Punk'], 'native: TCON');
        t.deepEqual(id3v23.TYER, ['1998'], 'native: TYER');
        t.deepEqual(id3v23.TCOM, ['CA'], 'native: TCOM'); // ToDo: common property?
        t.deepEqual(id3v23.TRCK, ['04'], 'native: TRCK');
        t.deepEqual(id3v23.COMM, [{description: "", language: "eng", text: "Jive"}], 'native: COMM');
      }

      return mm.parseFile(filePath, {duration: true, native: true}).then((result) => {

        checkFormat(result.format);
        checkCommon(result.common);
        checkID3v23(mm.orderTags(result.native['ID3v2.3']));
        checkID3v1(mm.orderTags(result.native['ID3v1.1']));
      });

    });

    it("should decode 07 - I'm Cool.mp3", function() {
      // 'LAME3.91' found on position 81BCF=531407

      const filePath = path.join(__dirname, 'samples', "07 - I'm Cool.mp3");

      this.timeout(15000); // It takes a long time to parse

      function checkFormat(format) {
        t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1.1'], 'format.type');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        // t.strictEqual(format.numberOfSamples, 8040655, 'format.numberOfSamples'); // FooBar says 8.040.655 samples
        t.strictEqual(format.duration, 200.9861224489796, 'format.duration'); // FooBar says 3:26.329 seconds
        t.strictEqual(format.bitrate, 320000, 'format.bitrate = 128 kbit/sec');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
        // t.strictEqual(format.encoder, 'LAME3.98r', 'format.encoder'); // 'LAME3.91' found on position 81BCF=531407// 'LAME3.91' found on position 81BCF=531407
        // t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
      }

      function checkCommon(common) {
        t.strictEqual(common.title, "I'm Cool", 'common.title');
        t.deepEqual(common.artists, ['Reel Big Fish'], 'common.artists');
        t.strictEqual(common.albumartist, 'Reel Big Fish', 'common.albumartist');
        t.strictEqual(common.album, 'Why Do They Rock So Hard?', 'common.album');
        t.strictEqual(common.year, 1998, 'common.year');
        t.strictEqual(common.track.no, 7, 'common.track.no');
        t.strictEqual(common.track.of, null, 'common.track.of');
        t.strictEqual(common.disk.no, null, 'common.disk.no');
        t.strictEqual(common.disk.of, null, 'common.disk.of');
        t.strictEqual(common.genre[0], 'Ska-Punk', 'common.genre');
      }

      function checkID3v23(native: mm.INativeTagDict) {
        t.deepEqual(native.TPE2, ['Reel Big Fish'], 'native: TPE2');
        t.deepEqual(native.TIT2, ["I'm Cool"], 'native: TIT2');
        t.deepEqual(native.TALB, ['Why Do They Rock So Hard?'], 'native: TALB');
        t.deepEqual(native.TPE1, ['Reel Big Fish'], 'native: TPE1');
        t.deepEqual(native.TCON, ['Ska-Punk'], 'native: TCON');
        t.deepEqual(native.TYER, ['1998'], 'native: TYER');
        t.deepEqual(native.TCOM, ['CA'], 'native: TCOM'); // ToDo: common property?
        t.deepEqual(native.TRCK, ['07'], 'native: TRCK');
        t.deepEqual(native.COMM, [{description: "", language: "eng", text: "Jive"}], 'native: COMM');
      }

      return mm.parseFile(filePath, {duration: true, native: true}).then((result) => {

        checkFormat(result.format);
        checkCommon(result.common);
        checkID3v23(mm.orderTags(result.native['ID3v2.3']));
      });
    });
  });

});